# Security policy

Sentinel is a personal portfolio demo. **Do not use Sentinel as a real security monitoring product.** Do not enter real credentials, customer information or security incident data.

Authentication uses public mock accounts and deterministic demo tokens. There is no backend, database, real threat processing or live WebSocket. Frontend RBAC improves interface behavior but cannot enforce server authorization. Actions affect local mock data; a reload can reset them. Preferences use localStorage and demo sessions use sessionStorage. Neither is a secure vault.

## Reporting

When this repository is public, use GitHub's **Security → Report a vulnerability** if private vulnerability reporting has been enabled by the maintainer. Otherwise contact the maintainer through the contact method listed on their GitHub profile; no dedicated security mailbox is configured. Include affected version, reproduction steps and impact, using fictional data. Avoid posting sensitive exploits or credentials in public issues. Ordinary demo behavior and nonsensitive bugs can be reported as issues.

Version 1.0.0 is the release prepared for review. There is no enterprise support SLA. Dependency audit results and validation limitations are recorded in [release validation](docs/release-validation.md). Never commit production secrets or tokens.
