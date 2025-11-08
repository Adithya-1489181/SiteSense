# Performance Module - File Structure

## Core Files

### `evaluator.js`
The main audit engine that:
- Runs Lighthouse audits on individual pages
- Calculates impact and effort factors
- Extracts and categorizes issues
- Aggregates results across multiple endpoints
- Computes overall scores

### `index.js`
Main entry point providing:
- Input validation
- Audit execution
- Results export (JSON + text summary)
- Public API for programmatic usage

### `cli.js`
Command-line interface:
- Accepts input from files or direct URLs
- Displays progress and results
- Supports output file specification

### `utils.js`
Utility functions:
- URL validation
- Score formatting and grading
- Text report generation
- Data manipulation helpers

### `compare.js`
Audit comparison tool:
- Compare two audit results
- Track score improvements/regressions
- Identify resolved and new issues
- Generate change reports

## Configuration Files

### `package.json`
NPM package configuration with scripts:
- `npm run audit` - Run CLI auditor
- `npm run example` - Run example
- `npm run compare` - Compare two audits

### `input-schema.json`
JSON schema for input validation

### `.gitignore`
Excludes output files and dependencies

## Documentation Files

### `README.md`
Complete documentation covering:
- Installation and setup
- Usage examples (CLI and programmatic)
- Input/output formats
- Impact and effort factors
- Troubleshooting

### `QUICKSTART.md`
Quick start guide for getting started quickly

## Example Files

### `example-input.json`
Sample input configuration

### `sample-output.json`
Example of generated audit results

### `example.js`
Runnable example demonstrating usage

## Usage Flow

```
Input JSON → Validator → Lighthouse Audits → Aggregation → Output
     ↓                         ↓                  ↓            ↓
  Schema              Individual Pages      Group Issues   JSON + TXT
```

## Data Flow

1. **Input**: JSON with endpoints array
2. **Validation**: Check URLs and configuration
3. **Audit**: Run Lighthouse on each endpoint
4. **Processing**: Extract issues, calculate scores
5. **Aggregation**: Group similar issues, compute overall scores
6. **Output**: Generate comprehensive JSON report

## Key Features

- ✅ Multi-endpoint auditing
- ✅ Overall score calculation
- ✅ Impact/effort classification
- ✅ Issue grouping and prioritization
- ✅ Detailed metrics per page
- ✅ Progress comparison
- ✅ Export to JSON and text formats

## File Dependencies

```
cli.js
  ├── index.js
  │   ├── evaluator.js
  │   └── utils.js
  └── utils.js

compare.js
  └── utils.js

example.js
  └── index.js
      └── evaluator.js
```
