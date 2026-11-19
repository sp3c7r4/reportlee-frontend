## Purpose
Defines how the report page names who reviews the report.

## ADDED Requirements

### Requirement: Reviewed by label
The report page SHALL name the report's reviewers from the same rule as the server. It SHALL show the Head's name when the Space has an active Head and the author is not that Head. It SHALL show "Workspace admins" when the Space has no Head, when the Head is deactivated, or when the author is a Head. It SHALL NOT show "Your Head of Space" unless a Head exists.

#### Scenario: Space with a Head
- **WHEN** a Staff member opens their report and the Space has Head "Ada Eze"
- **THEN** the label names Ada Eze

#### Scenario: Space without a Head
- **WHEN** a Staff member opens their report and the Space has no Head
- **THEN** the label reads "Workspace admins"

#### Scenario: Head author
- **WHEN** a Head opens their own report
- **THEN** the label reads "Workspace admins"

#### Scenario: Deactivated Head
- **WHEN** the Space's Head is deactivated
- **THEN** the label reads "Workspace admins"
