## Purpose
Defines Reporting periods: the span a report covers, with a start, an end and a deadline. Covers how periods follow the Schedule in each cadence and time zone, which period is current, and the 7 day grace after a deadline.

## ADDED Requirements
### Requirement: Periods follow the Schedule in the Workspace time zone
The system SHALL generate each period from the Schedule in force when the period starts. A period SHALL start at local midnight on a boundary date, except the first period of a new Schedule version, which starts at the moment the version takes effect. A period SHALL end one second before the next boundary, and be due at the Schedule's time on the next boundary date. Every period SHALL be labelled from its local start date in the Schedule's time zone. Local times SHALL be those of the Schedule's time zone, including across daylight saving changes.
#### Scenario: Weekly default
- **WHEN** the Schedule is weekly, Monday, 17:00 in Africa/Lagos
- **THEN** the week of Monday 19 October 2026 starts 19 October 00:00, ends Sunday 25 October 23:59:59 and is due Monday 26 October 17:00, local time
#### Scenario: Fortnightly
- **WHEN** the Schedule is fortnightly
- **THEN** after the first period of a Schedule version, consecutive periods start 14 days apart
#### Scenario: Monthly with a short month
- **WHEN** the Schedule is monthly on day 31
- **THEN** a month with fewer days starts on its last day
#### Scenario: Monthly last day
- **WHEN** the Schedule is monthly on the last day
- **THEN** every period starts on the last day of a month
#### Scenario: Quarterly
- **WHEN** the Schedule is quarterly
- **THEN** periods start in January, April, July and October
#### Scenario: Daylight saving
- **WHEN** a weekly period in America/New_York spans the end of daylight saving time
- **THEN** the deadline is still 17:00 local time on its date and the period is one hour longer than 168 hours
#### Scenario: Local time that does not exist
- **WHEN** a boundary or deadline falls on a local time skipped by a clock change
- **THEN** it becomes the first local time after the skip, so 02:30 on 14 March 2027 in America/New_York becomes 03:00 local time, and midnight skipped in Africa/Cairo becomes 01:00
#### Scenario: First period after a Schedule change
- **WHEN** a Schedule change takes effect at a moment that is not a boundary of the new rule, for example weekly Monday changed to weekly Friday at Monday 2 November 2026 00:00 in Africa/Lagos
- **THEN** the first period of the new rule starts at that moment and ends before the next boundary of the new rule (Thursday 5 November 23:59:59, due Friday 6 November), and every period after it is a full period
#### Scenario: Label of a first period that starts mid cycle
- **WHEN** the first period of a new Schedule version starts on 2 November 2026 and the cadence is weekly
- **THEN** its label is "Week of 2 November", and the same start date gives "Fortnight of 2 November" for fortnightly, "Monday 2 November" for daily and "Quarter starting 2 November 2026" for quarterly
#### Scenario: Time zone changed with a Schedule change
- **WHEN** a Schedule change takes effect at 2 November 2026 00:00 Lagos time and the new time zone is Africa/Cairo
- **THEN** the first period of the new rule starts at that moment, which is 01:00 in Cairo, and all later boundaries use Cairo local midnight

### Requirement: The current period is the one still waiting for its deadline
The system SHALL report as current the earliest period whose deadline has not passed, or the period containing the present moment when no open period has a later deadline. The period SHALL be created the first time anyone asks, exactly once, however many requests arrive together. A period that has not started SHALL NOT be created.
#### Scenario: Before the deadline
- **WHEN** it is Monday 26 October 2026 at 15:30 and the Schedule is the default
- **THEN** the current period is the week of 19 October
#### Scenario: At the deadline
- **WHEN** it is exactly Monday 26 October 2026 at 17:00:00.000 and the Schedule is the default
- **THEN** the current period is still the week of 19 October
#### Scenario: After the deadline
- **WHEN** it is Monday 26 October 2026 at 17:00:00.001 or later and the Schedule is the default
- **THEN** the current period is the week of 26 October
#### Scenario: Simultaneous first requests
- **WHEN** many members ask for the current period at the same moment
- **THEN** they all receive the same period and only one is stored
#### Scenario: Not a member
- **WHEN** a person who is not an active member of the Workspace asks for its periods
- **THEN** the response is 404

### Requirement: Submissions are accepted for 7 days after the deadline
The system SHALL accept a submission for a period until 7 days (168 hours) after its deadline. After that the period is closed and a report that was never submitted counts as missing. The grace SHALL NOT be configurable. The system SHALL list every open period, so a person can reach a late period once the current one has moved on. A period that ended before the Workspace was created SHALL NOT be listed as open, except the current period.
#### Scenario: Open periods
- **WHEN** it is Wednesday 28 October 2026 and the Schedule is the default
- **THEN** the open periods are the weeks of 19 October and 26 October, oldest first
#### Scenario: Workspace created mid-week
- **WHEN** a Workspace is created on Wednesday 28 October 2026 with the default Schedule
- **THEN** the only open period is the week of 26 October, and the week of 19 October is not asked for
#### Scenario: Closed
- **WHEN** it is more than 168 hours after a period's deadline
- **THEN** the period is not listed as open and a submission for it is refused
#### Scenario: Not yet started
- **WHEN** a person saves a draft for a period that has not started
- **THEN** the response is 409 with the code PERIOD_NOT_OPEN
