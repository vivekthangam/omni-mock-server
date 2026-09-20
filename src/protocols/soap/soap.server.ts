import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { auditService } from '../../audit/audit.service';

const router = Router();
const parser = new XMLParser({ ignoreAttributes: false });
const builder = new XMLBuilder({ ignoreAttributes: false, format: true });

const WSDL_PATH = fs.existsSync(path.resolve(process.cwd(), 'wsdl/test_service.wsdl'))
  ? path.resolve(process.cwd(), 'wsdl/test_service.wsdl')
  : path.resolve(__dirname, '../../../wsdl/test_service.wsdl');


// Serve WSDL definition
router.get('/service', (req: Request, res: Response) => {
  if (req.query.wsdl !== undefined || req.query.WSDL !== undefined) {
    if (fs.existsSync(WSDL_PATH)) {
      const wsdlContent = fs.readFileSync(WSDL_PATH, 'utf-8');
      res.setHeader('Content-Type', 'text/xml');
      return res.send(wsdlContent);
    }
    return res.status(404).send('WSDL file not found');
  }

  res.send('OmniMock SOAP Service endpoint. Use ?wsdl to view the WSDL definition.');
});

// Process SOAP Request
router.post('/service', (req: Request, res: Response) => {
  const xmlBody = typeof req.body === 'string' ? req.body : '';
  const soapAction = req.headers.soapaction ? String(req.headers.soapaction).replace(/"/g, '') : '';

  let parsed: any = {};
  try {
    if (xmlBody) {
      parsed = parser.parse(xmlBody);
    }
  } catch (err: any) {
    // Return SOAP Fault for malformed XML
    return sendSoapFault(res, 'Client', 'Malformed SOAP XML', err.message);
  }

  // Detect requested operation
  const envelope = parsed['soap:Envelope'] || parsed['soapenv:Envelope'] || parsed['Envelope'] || {};
  const body = envelope['soap:Body'] || envelope['soapenv:Body'] || envelope['Body'] || {};

  auditService.record({
    protocol: 'SOAP',
    method: soapAction || 'SOAP_CALL',
    path: '/soap/service',
    headers: req.headers,
    requestBody: xmlBody,
  });

  if (body.GetUserDetailsRequest || soapAction.includes('GetUserDetails')) {
    const userId = body.GetUserDetailsRequest?.userId || 'usr_123';
    const responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://omnimock.local/soap/service">
  <soap:Body>
    <tns:GetUserDetailsResponse>
      <tns:id>${userId}</tns:id>
      <tns:name>Alice SOAP Developer</tns:name>
      <tns:email>alice.soap@example.com</tns:email>
      <tns:status>ACTIVE</tns:status>
    </tns:GetUserDetailsResponse>
  </soap:Body>
</soap:Envelope>`;

    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    return res.send(responseXml);
  }

  if (body.ProcessTransactionRequest || soapAction.includes('ProcessTransaction')) {
    const tx = body.ProcessTransactionRequest || {};
    const responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://omnimock.local/soap/service">
  <soap:Body>
    <tns:ProcessTransactionResponse>
      <tns:transactionId>tx_${Date.now()}</tns:transactionId>
      <tns:status>SUCCESS</tns:status>
      <tns:timestamp>${new Date().toISOString()}</tns:timestamp>
    </tns:ProcessTransactionResponse>
  </soap:Body>
</soap:Envelope>`;

    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    return res.send(responseXml);
  }

  // Fault if operation not recognized
  return sendSoapFault(res, 'Client', 'Unknown SOAP Operation', 'Supported operations: GetUserDetails, ProcessTransaction');
});

function sendSoapFault(res: Response, faultCode: string, faultString: string, detail: string) {
  const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:${faultCode}</faultcode>
      <faultstring>${faultString}</faultstring>
      <detail>${detail}</detail>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;

  res.status(500);
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.send(faultXml);
}

export default router;
