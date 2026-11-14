# Ready-made 3D anatomy models (searched 2026-11-14)

Goal: the opened-cow look the user wants (a cow with a side window showing rumen, reticulum, omasum, abomasum, intestines).
All Sketchfab downloads need a Sketchfab API token (free account). The user has not given one yet.

| Model | Licence | Size | Fit |
|---|---|---|---|
| [Anatomy of a Cow](https://sketchfab.com/3d-models/anatomy-of-a-cow-5e9aa74139bc4665888f265182871ac2) (Baylecorn) | Sketchfab Free Standard | 12k faces | **Best match**: whole cow with the side cut open and organs inside, exactly the reference look. Light enough for CPU render. |
| [Cow_Digestive_System_Final](https://sketchfab.com/3d-models/cow-digestive-system-final-21aece85af604b638f90de3556b9af58) (creativelonitics) | CC BY (credit needed) | 128k faces | Digestive tract alone (stomach chambers + coiled intestine). Can sit inside our own cow window. |
| [Bovine Rumen](https://sketchfab.com/3d-models/rumen-ec58bb93101448349c4551c89a41429c) (OVCanatomy) | CC BY | 1.5M faces | Real scanned rumen. Too heavy as is; would need decimating. |
| [Whole Cow Heart](https://sketchfab.com/3d-models/whole-cow-heart-fixed-c49f873ba4be4193b880bdf624957dc4) (VisibleHeartLabs) | CC BY | 400k faces | Real heart scan, for a heart video. |
| vetanat.uzh, FESC-UNAM stomach models | not downloadable | | View only. |
| vetanatMunich (616 models) | CC BY-NC-ND | | No derivatives / no commercial: do not use. |
| [Z-Anatomy](https://www.cgchannel.com/2022/05/check-out-amazing-free-3d-anatomy-reference-z-anatomy/2/) / BodyParts3D | CC BY-SA | | Human only (Blender file). |
| [NIH 3D HRA organs](https://3d.nih.gov/collections/40) | check per model | | Human organs. |

Fallback without a token: our own `cutBox` window + procedural organs (`plans/cow_anatomy.mjs`).
