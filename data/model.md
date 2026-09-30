# Sealed data model (MVP)

Gmail is the source of truth for mail. Story tables only point at Gmail ids.

## Message
| field | type | notes |
|---|---|---|
| id | string | Gmail message id (fixture uses `m_01`…) |
| threadId | string | Gmail thread id |
| fromName | string | display name |
| fromEmail | string | |
| subject | string | always shown as-is |
| snippet | string | list preview |
| body | string | plain text for stub; HTML later |
| sentAt | ISO string | |
| labelIds | string[] | INBOX, UNREAD, STARRED, IMPORTANT, CATEGORY_PROMOTIONS… |
| isUnread | bool | derived from UNREAD in live app |
| isHuman | bool | heuristic: not noreply + not promo category |
| isPromo | bool | CATEGORY_PROMOTIONS or fixture flag |
| priority | urgent \| normal \| ambient | urgent skips wax theater |
| attachment | {name, type} \| null | |
| characterId | string | FK |

## Character
| field | type |
|---|---|
| id | string |
| name | string |
| email | string or domain |
| titleInWorld | string |
| portraitSeed | string |
| initials | string |
| relationship | 0–100 |

## Chapter
| field | type |
|---|---|
| id | string |
| characterId | string |
| title | string |
| needed | number |
| opened | number |

## ChronicleEntry
| field | type |
|---|---|
| id | string |
| messageId | string \| null |
| characterId | string \| null |
| text | string |
| footnote | string |
| createdAt | ISO string |

## AppState (device only)
worldId, view, selectedMessageId, listMode, chronicle[], filedIds[]
