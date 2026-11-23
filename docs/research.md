# What does an average European municipality actually do?

Research notes behind *Gemeente Voxelstad* (September 2026).

## Core task portfolio

Municipal competences differ per country, but across the EU the same clusters recur. The Dutch government's own list of municipal tasks and the CEMR overview of local government responsibilities agree on the following core:

| Domain | Typical tasks | Notes |
|---|---|---|
| Civil affairs | Population register, passports, ID cards, driving licences, births, marriages, deaths, address changes | Highest-volume citizen contact. The Netherlands faces a "passport peak" 2024-2029 as 10-year documents from 2014-2019 expire. |
| Waste & public space | Household collection, separated streams, bulky waste, litter, street cleaning, green maintenance | Executed under environmental legislation (NL: Wet milieubeheer). Often the largest fleet a municipality runs. |
| Permits & spatial planning | Building and environmental permits, zoning plans (NL: omgevingsplan), housing agreements with corporations | Low volume, high cost per case, politically visible. |
| Social support & youth | Home care and support (NL: Wmo), benefits and participation (Participatiewet), youth care | Largest spend. Decentralised to municipalities in many countries. |
| Roads & infrastructure | Streets, cycle paths, lighting, sewers, bridges, potholes | Asset management; sensors and digital twins now common. |
| Education, culture, economy | School buildings, libraries, pools, sports, market and event licences, business zones | Mostly facilities and subsidies. |

Health and education staffing are municipal in the Nordics and parts of Central Europe but not in the Netherlands, so the game keeps them as facilities only.

## Money

EU general government spending was about 49% of GDP in 2024; social protection is 44% of all spending. At municipal level the social domain and general public services (the service desk itself) dominate. The game models the discretionary service budget, not the whole balance sheet.

## The digital and sovereign toolkit (2025-2026)

- **EU Digital Identity Wallet (eIDAS 2.0)**: every member state must offer a wallet by end of 2026. Municipalities become relying parties for login and signing.
- **Once-only principle and the Once-Only Technical System**: live since December 2023 under the Single Digital Gateway Regulation. Dutch municipalities connected in 2025. Estonia's X-Road is the reference model: about 295 million requests a month and an estimated 2% of GDP saved.
- **Open-source workplace**: Schleswig-Holstein made LibreOffice the binding standard in December 2025 and reports over €15 million a year in avoided licence costs, with Nextcloud and OpenTalk replacing SharePoint and Teams. Germany's federal openDesk stack has a partner programme since early 2026.
- **Sovereign cloud**: Gaia-X is referenced in the Commission's Cloud Sovereignty Framework; 2026 is widely called the year of EU cloud sovereignty.
- **NIS2**: municipalities are in scope in most member states. Registration with the national CSIRT and incident reporting deadlines apply. Ransomware against local government remains the most common serious incident.
- **AI assistants and the AI Act**: Annex III obligations (including public assistance benefits) apply from 2 August 2026. Cities such as Amsterdam, The Hague, Espoo and Riga publish algorithm registers and AI accountability reports.

## How this maps to the game

Each investment in the game is one of these building blocks. Sovereign choices raise a sovereignty index that unlocks EU co-funding and immunises against vendor price hikes; security choices deflect ransomware and breach events; the AI assistant is only safe with an algorithm register in place.

## Sources

- https://www.rijksoverheid.nl/themas/overheid-en-democratie/gemeenten/taken-gemeente
- https://www.terri.cemr.eu/en/
- https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Government_expenditure_by_function_%E2%80%93_COFOG
- https://ec.europa.eu/digital-building-blocks/sites/spaces/OOTS/pages/935397650/Breakthrough+in+European+Digital+Identity+Framework+Connection+of+Dutch+Municipalities+to+Once+Only+Technical+System
- https://infocert.digital/blog/eidas/
- https://www.thedroptimes.com/70889/schleswig-holstein-open-source-migration
- https://europioneer.io/en/blog/schleswig-holstein-blueprint-libreoffice-migration-states-municipalities-2026
- https://nortal.com/insights/why-digital-sovereignty-matters-and-how-x-road-makes-it-happen
- https://gaia-x.eu/gaia-x-referenced-in-the-european-commission-cloud-sovereignty-framework/
- https://www.ictrechtswijzer.be/en/nis2-cybersecurity-in-government-organizations/
- https://botnation.ai/en/public-service-chatbot/
- https://windowsnews.ai/article/how-european-cities-are-turning-ai-into-governed-public-infrastructure-in-2026.423323
