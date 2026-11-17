## Purpose
Defines the Workspace Schedule: how often people report and when the deadline falls. One Schedule applies to a Workspace at a time. Covers the default, who may change it, validation, and when a change takes effect.

## ADDED Requirements
### Requirement: A Workspace always has a Schedule
The system SHALL give every Workspace a Schedule. A Workspace that never set one SHALL report weekly, with each period starting on Monday and its deadline on Monday at 17:00 in the Workspace time zone. Every member of the Workspace SHALL be able to read the Schedule.
#### Scenario: Default
- **WHEN** a member reads the Schedule of a Workspace whose Admin never changed it
- **THEN** it is weekly, Monday, 17:00, in the Workspace time zone, with no pending change
#### Scenario: Reading does not change anything
- **WHEN** a member reads the default Schedule
- **THEN** the Workspace's stored settings are unchanged
#### Scenario: Not a member
- **WHEN** a person who is not an active member of the Workspace reads its Schedule
- **THEN** the response is 404 and says nothing about the Workspace

### Requirement: Only Admins change the Schedule
The system SHALL let a Workspace Admin change the Schedule and SHALL refuse every other role. The five cadences SHALL be daily, weekly, fortnightly, monthly and quarterly. The change SHALL be checked by the server whatever the screen showed.
#### Scenario: Admin changes it
- **WHEN** an Admin saves a monthly Schedule on day 15 at 09:00
- **THEN** the response carries the new Schedule and the date it takes effect
#### Scenario: Staff or Head changes it
- **WHEN** a Head or Staff member tries to change the Schedule
- **THEN** the response is 403 and the Schedule is unchanged
#### Scenario: Weekly needs a weekday
- **WHEN** an Admin saves a weekly Schedule with no weekday
- **THEN** the response is 400 with a message beside the weekday field
#### Scenario: Monthly needs a day
- **WHEN** an Admin saves a monthly or quarterly Schedule with neither a day of the month nor the last-day option
- **THEN** the response is 400 with a message beside the day field
#### Scenario: Bad time or time zone
- **WHEN** an Admin saves a time that is not HH:MM between 00:00 and 23:59, or a time zone the system does not know
- **THEN** the response is 400 with a message beside that field

### Requirement: A change applies from the next period
The system SHALL apply a Schedule change from the first period that starts after the moment of the change. Periods that already exist SHALL keep their start, end and deadline. A second change before that moment SHALL replace the first.
#### Scenario: Period in progress
- **WHEN** an Admin changes the Schedule in the middle of a period
- **THEN** that period keeps its deadline and the new rule starts with the next period
#### Scenario: Replaced pending change
- **WHEN** an Admin changes the Schedule twice before the next period starts
- **THEN** only the second change takes effect
#### Scenario: Shown as a date
- **WHEN** a Schedule change is saved
- **THEN** the response states the date and time from which it applies
### Requirement: The Schedule owns its time zone
The system SHALL keep the Schedule's time zone from the moment the Schedule exists, and a change to the Workspace's own time zone SHALL NOT move any period. A Schedule time zone SHALL change only through a Schedule change by an Admin.
#### Scenario: Workspace zone changed before any period exists
- **WHEN** an Admin changes the Workspace time zone and nobody has asked for a period yet
- **THEN** the Schedule keeps the zone the Workspace had before the change
#### Scenario: Workspace zone changed later
- **WHEN** an Admin changes the Workspace time zone after periods exist
- **THEN** every existing period and the Schedule time zone are unchanged
