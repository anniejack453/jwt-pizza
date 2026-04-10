# Incident: 2026-04-08 17-45-34

## Summary

> [!NOTE]
> Write a summary of the incident in a few sentences. Include what happened, why, the severity of the incident and how long the impact lasted.

```md
Between the hour of 17:45 and 18:01 on 04/08/26, 1 user encountered an issue with ordering pizzas. The event was triggered by a factory server shutdown at 17:45. The factory server shutdown was instigated by a chaos monkey.

The factory server shutdown caused all pizza orders to fail. The event was detected by Grafana. The team started working on the event by carefully debugging code and examining logs. This severe incident affected 50% of users.
```

## Detection

> [!NOTE]
> When did the team detect the incident? How did they know it was happening? How could we improve time-to-detection? Consider: How would we have cut that time by half?

```md
This incident was detected when the pizza creation failure alert was triggered and the dev team were paged. However, this was 10 minutes after the incident first appeared.

More concise alerting systems will be set up by the dev team so that response time will improve.
```

## Impact

> [!NOTE]
> Describe how the incident impacted internal and external users during the incident. Include how many support cases were raised.

```md
For 16 minutes between 17:45 UTC and 18:01 UTC on 04/08/26, the pizza factory server was shut down.

This incident affected 1 customer (50% OF JWT PIZZA USERS), who experienced order failure.
```

## Timeline

> [!NOTE]
> Detail the incident timeline. We recommend using UTC to standardize for timezones.
> Include any notable lead-up events, any starts of activity, the first known impact, and escalations. Note any decisions or changed made, and when the incident ended, along with any post-impact events of note.

```md
All times are UTC.

- _17:45_ - Pizza factory server shutdown started
- _17:54_ - Dev team alerted
- _17:55_ - Dev team debugging process started
- _18:01_ - Server connection reestablished
- _18:02_ - Pizza order successfully made. All systems in order
```

## Response

> [!NOTE]
> Who responded to the incident? When did they respond, and what did they do? Note any delays or obstacles to responding.

```md
After receiving a page at 17:54 UTC, Developer A came online at 17:55 UTC in the JWT Pizza HQ.
```

## Root cause

> [!NOTE]
> Note the final root cause of the incident, the thing identified that needs to change in order to prevent this class of incident from happening again.

```md
A chaos testing experiment that shut down the factory server to test team response time and debugging ability.
```

## Resolution

> [!NOTE]
> Describe how the service was restored and the incident was deemed over. Detail how the service was successfully restored and you knew how what steps you needed to take to recovery.
> Depending on the scenario, consider these questions: How could you improve time to mitigation? How could you have cut that time by half?

```md
Connection to the server was restored by following the link given in the factory failure error response. Incident was deemed over when there was a successful pizza order. Upon examining the logs and the code, a system for reestablishing a factory server connection was discovered.
```

## Prevention

> [!NOTE]
> Now that you know the root cause, can you look back and see any other incidents that could have the same root cause? If yes, note what mitigation was attempted in those incidents and ask why this incident occurred again.

```md
If there is another round of chaos testing, this issue may reoccur. Addressing the issue should be faster next time with a prior fix implemented.
```

## Action items

> [!NOTE]
> Describe the corrective action ordered to prevent this class of incident in the future. Note who is responsible and when they have to complete the work and where that work is being tracked.

```md
1. Updated error response alerting system
2. Factory server backup
```
