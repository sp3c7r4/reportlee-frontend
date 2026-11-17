## Purpose
Defines what the server does to report content before storing it. Report text, tags, attachments and location come from users and are untrusted, whatever the browser already did.

## ADDED Requirements
### Requirement: Report HTML is sanitised on every write
The system SHALL sanitise the accomplishments, challenges and plans of a report on every save, submit and edit, and SHALL store only the sanitised result. It SHALL keep only basic formatting: paragraphs, line breaks, bold, italic, underline, strike, code, quotes, lists, headings and links. It SHALL remove scripts and their contents, event handler attributes, styles, images, frames and other embedded content, and links that do not use http, https or mailto. Every link SHALL open safely in a new tab. Sanitising twice SHALL give the same result as once.
#### Scenario: Script removed
- **WHEN** a save contains a script element
- **THEN** the stored text has neither the element nor its contents
#### Scenario: Event handler removed
- **WHEN** a save contains an image or link with an onerror or onclick attribute
- **THEN** the stored text has no such attribute
#### Scenario: Unsafe link
- **WHEN** a save contains a link to a javascript: or data: address
- **THEN** the stored link has no address
#### Scenario: Normal formatting kept
- **WHEN** a save contains bold text, a list and a https link
- **THEN** all three are stored as sent, and the link opens in a new tab with no opener
#### Scenario: Repeat
- **WHEN** an already stored text is saved again unchanged
- **THEN** it is stored unchanged

### Requirement: Content limits are enforced by the server
The system SHALL refuse a section of more than 20000 characters of HTML or more than 5000 characters of visible text, more than 30 KPI rows, more than 10 attachment entries, more than 5 tagged colleagues, and a location outside the valid latitude, longitude and accuracy ranges. Each refusal SHALL be a 400 with a message beside the field. Unknown fields in a request SHALL be refused.
#### Scenario: Too long
- **WHEN** a section has 5001 characters of visible text
- **THEN** the response is 400 with a message beside that section
#### Scenario: Unknown field
- **WHEN** a request body carries a field the server does not define, such as an author id
- **THEN** the response is 400 and nothing is stored

### Requirement: Tags name active colleagues and grant nothing
The system SHALL accept as tags only active members of the same Workspace other than the author. A tag SHALL NOT give the tagged person access to the report.
#### Scenario: Outside the Workspace
- **WHEN** a save tags a member of another Workspace
- **THEN** the response is 400 with a message beside the tags field
#### Scenario: Self tag
- **WHEN** an author tags themselves
- **THEN** the response is 400 with a message beside the tags field
#### Scenario: Tag grants no access
- **WHEN** a tagged colleague who is not a reviewer asks for the report
- **THEN** the response is 404

### Requirement: Report text is not logged
The system SHALL NOT write report text, KPI values, tags or location into logs.
#### Scenario: Request logging
- **WHEN** a draft is saved
- **THEN** no log line contains any of the saved text
