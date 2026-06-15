# Synthetic Pilot Data

## Safety

The generator uses fabricated `.test` email addresses and reserved pilot phone
numbers. It rejects production and requires:

```powershell
$env:PILOT_DATA_MODE = "development"
```

It never prints configuration secrets.

## Usage

First establish the baseline organizations, projects, roles, priorities, and
workflow records:

```powershell
npm run seed
```

Generate the Stage 4 intake and visit scenarios:

```powershell
$env:PILOT_DATA_MODE = "development"
npm run pilot-data
```

Reset only Stage 4 records:

```powershell
$env:PILOT_DATA_MODE = "development"
npm run pilot-data:reset
```

Each generation resets records whose campaign starts with
`stage4-pilot-`, making reruns repeatable without deleting unrelated data.
Scenarios include website, webhook, manual, duplicate, after-hours, HOT and
WARM intake behavior, AI signals, and completed and missed visits. The base
seed supplies multiple organizations, projects, users, all four priorities,
SLA, alerts, and workflow records.
