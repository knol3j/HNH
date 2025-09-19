# HashNHedge Security Policy

## Security Mode Overview

HashNHedge implements comprehensive security measures to protect the mining pool and its users. The platform features both standard operation and enhanced security modes.

## Supported Versions

| Version | Security Support   | Notes                    |
| ------- | ------------------ | ------------------------ |
| 1.0.x   | :white_check_mark: | Full security monitoring |
| < 1.0   | :x:                | Upgrade required         |

## Security Features

### 1. Input Validation & Sanitization
- **Wallet Address Validation**: Strict Solana address format checking
- **Hash Validation**: SHA256 format verification for share submissions
- **Nonce Validation**: Range and type checking for mining nonces
- **Timestamp Validation**: Prevents replay attacks with time-based checks
- **Worker Name Sanitization**: Alphanumeric-only worker identifiers

### 2. Rate Limiting
- **API Rate Limiting**: 100 requests per 15 minutes per IP
- **Mining Rate Limiting**: 60 requests per minute for miners
- **Share Submission Rate**: 1 second minimum between submissions
- **Connection Throttling**: Prevents spam connections

### 3. Authentication & Authorization
- **Admin Token Authentication**: Secure bearer token for admin functions
- **Security Dashboard Access**: Protected administrative interface
- **API Endpoint Protection**: Role-based access control

### 4. Security Monitoring
- **Real-time Event Logging**: All security events tracked with IP and timestamp
- **Threat Level Assessment**: Automatic threat level calculation based on activity
- **Suspicious Activity Detection**: Pattern recognition for malicious behavior
- **Security Event Categories**:
  - `INVALID_WALLET`: Invalid wallet address format
  - `INVALID_HASH`: Malformed hash submissions
  - `INVALID_NONCE`: Invalid nonce values
  - `INVALID_TIMESTAMP`: Stale or future timestamps
  - `SHARE_SPAM`: Excessive share submission rate
  - `UNREGISTERED_MINER`: Submissions from unconnected miners
  - `UNAUTHORIZED_ACCESS`: Admin access attempts without token

### 5. Security Headers & CORS
- **Helmet.js Integration**: Complete security header protection
- **Content Security Policy**: Prevents XSS and injection attacks
- **CORS Configuration**: Restricted to authorized domains
- **HTTP Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.

### 6. Data Protection
- **Memory Management**: Automatic cleanup of old security events
- **Secure Token Generation**: Cryptographically secure admin tokens
- **Connection Encryption**: HTTPS enforcement in production
- **Sensitive Data Handling**: No logging of sensitive information

## Security Dashboard

### Access Requirements
- Admin token authentication required
- Real-time monitoring interface at `/security-dashboard.html`
- Secure API endpoints under `/api/admin/`

### Dashboard Features
- **System Health Monitoring**: Uptime, memory usage, connection status
- **Network Statistics**: Active miners, hashrate, total connections
- **Security Event Tracking**: Real-time event log with categorization
- **Threat Level Indicator**: Dynamic threat assessment
- **Security Mode Control**: Enable/disable enhanced monitoring

### Admin Token
The admin token is automatically generated on server startup and displayed in console logs:
```
🔐 Admin token: [64-character-hex-string]
```

## Security Modes

### Normal Mode
- Standard input validation
- Basic rate limiting
- Security event logging
- Regular monitoring

### Enhanced Security Mode
- Stricter validation rules
- Reduced rate limits
- Enhanced logging verbosity
- Real-time threat analysis
- Automated response protocols

## Incident Response

### Automatic Responses
1. **Rate Limit Violations**: Temporary IP blocking
2. **Invalid Input Patterns**: Request rejection with logging
3. **Unauthorized Access**: Access denial with security event
4. **Suspicious Activity**: Enhanced monitoring activation

### Manual Responses
1. **Security Dashboard Review**: Monitor `/security-dashboard.html`
2. **Event Analysis**: Review security logs via API
3. **Mode Switching**: Toggle security modes as needed
4. **Connection Management**: Review and manage active connections

## Reporting a Vulnerability

### Contact Information
- **Security Email**: security@hashnhedge.com
- **Response Time**: 24-48 hours for initial response
- **Severity Assessment**: Within 72 hours

### Report Requirements
1. **Detailed Description**: Clear explanation of the vulnerability
2. **Reproduction Steps**: Step-by-step instructions
3. **Impact Assessment**: Potential security impact
4. **Suggested Fix**: If applicable

### Response Process
1. **Acknowledgment**: Initial receipt confirmation
2. **Investigation**: Security team review and validation
3. **Resolution**: Fix development and testing
4. **Disclosure**: Coordinated disclosure timeline
5. **Recognition**: Credit for responsible disclosure

## Security Best Practices

### For Operators
1. **Secure Admin Token**: Store admin token securely
2. **Regular Monitoring**: Check security dashboard daily
3. **Update Schedule**: Apply security updates promptly
4. **Access Control**: Limit administrative access
5. **Backup Security**: Maintain secure configuration backups

### For Miners
1. **Secure Wallets**: Use hardware or secure software wallets
2. **Connection Security**: Connect only to official pool URLs
3. **Software Updates**: Keep miner software updated
4. **Network Security**: Use secure network connections

## Security Compliance

- **Input Validation**: OWASP guidelines compliance
- **Rate Limiting**: Industry-standard protection
- **Authentication**: Secure token-based access
- **Monitoring**: Comprehensive security logging
- **Response**: Automated and manual incident response

## Security Updates

Security updates are prioritized and released as soon as possible. Critical security issues receive immediate attention with emergency releases if necessary.

For the latest security information, monitor:
- GitHub security advisories
- Official announcements
- Security dashboard notifications
