# Changelog

## [1.0.0] - 2025-11-08

### Added
- Initial release of SiteSense Security Module
- OWASP ZAP integration for comprehensive security scanning
- CLI interface with flexible input options
- Endpoint-only scanning capability (skip crawling)
- Performance optimization with multi-threading
- Fast active scan mode with smart timeout detection
- JSON schema validation for input files
- Detailed security reporting with risk categorization
- Batch processing support for multiple URLs
- Configurable scan parameters and exclusions

### Features
- **Security Scanning**: Uses OWASP ZAP for industry-standard vulnerability detection
- **Performance**: Multi-threaded scanning with configurable thread pools
- **Flexibility**: Support for both crawling-based and endpoint-only scanning
- **Reporting**: Comprehensive JSON output with human-readable summaries
- **Reliability**: Smart timeout handling and result retrieval fallbacks
- **Usability**: Command-line interface with extensive configuration options

### Technical Details
- Node.js ES modules with modern JavaScript
- Axios for HTTP API communication with ZAP
- JSON Schema validation for input configuration
- Modular architecture with separation of concerns
- Error handling and graceful degradation
- GitHub-friendly configuration and documentation