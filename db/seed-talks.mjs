// The talks loaded into the database the first time it is set up.
// Format of each line:  time | room | speakers | title
// (Lightning talks use their running order as the "position".)
// After the first setup, change talks from the admin page instead of here.

export const papers = `
10:20 AM | SC3102 | Cameron Cogburn (RPI); Robert McDonald, Casimer DeCusatis (Marist) | Traffic Partitioning on 100+ Qubit Processors for Cybersecurity Application
10:20 AM | SC3103 | Carolyn Sher-DeCusatis (Western Governors University) | Gamifying Software Security
10:20 AM | SC3105 | Will Lynch (Sentricus) | When the Cyber Incident Happens, Who Actually Decides?
10:40 AM | SC3102 | Pablo Rivas (Marist) | Beyond Quantum Shots: Evaluating the Security of Stochastic Quantum Neural Networks
10:40 AM | SC3103 | Aryan Patel, Angel Gonzalez, Yasmin Villa, Nathan White, Chris Oh (Bergen Community College) | Change Matters: Development of an Educative Chemistry Video Game
10:40 AM | SC3105 | Michael Zelinski (Central Hudson) | Anatomy of a Cyber Attack
11:00 AM | SC3102 | Bowu Zhang, Prisha Satish (Marist) | Is the Crypto-Native Generation Actually Crypto-Native?
11:00 AM | SC3103 | Eitel Lauria, Chase Taylor, Connor Fleishman, Ed Presutti, Eileen Bardney (Marist) | A Monitoring Dashboard for First-Semester, First-Year Students
11:00 AM | SC3105 | Stephanie Shum, Eric Weinmann, James Jenks, Kate Baumstein, Madison Guarin (IBM) | IBM Hardware Security Manager for Z Systems and LinuxONE
11:20 AM | SC3102 | Chris Wildgoose (IBM) | IBM Quantum System 1 and 2 Modular Architectures
11:20 AM | SC3103 | Saburi Raji (Sobirun Engineering Ltd.) | AI Framework for Finite Element Analysis Education
11:20 AM | SC3105 | Dominick Foti (Marist & University at Albany) | Phishing Attacks in a World of LLMs
1:00 PM | SC3101 | Damien Morales (PMI) | Leading AI Adoption Where Failure Isn't an Option: Lessons from Government Technology Delivery
1:00 PM | SC3102 | Gissella Bejarano, Roman Huerta (Marist) | Accessible Futures: AI and Sign Language Processing
1:00 PM | SC3103 | Robert McFarlane (Shen Milsom & Wilke LLC) | Power Demand for Mega-Data Centers
1:20 PM | SC3101 | Tomas Reyes (PMI, ChangeWorks LLC) | The Founder Without a PMO
1:20 PM | SC3102 | Ian Andujar, Yolanda Shepperd, Julia Daroshka (Bergen Community College) | Implementation of AI in Tandem with EEG for a Cost-Effective BCI Device
1:20 PM | SC3103 | Edward McCain, Dominic Schoeder, Charisse Liu (IBM) | Z Developer Productivity Assistant
1:40 PM | SC3101 | Erica Doyle (PMI) | From AI Hype to Business Value: Lessons in Change, Governance, and Project Delivery
1:40 PM | SC3102 | John Craig (IBM) | Alice Workspaces for the Agent Experience Problem
1:40 PM | SC3103 | Aparicio Carranza, Faridjon Jamshidov, Christopher Guiterrez, Jaiden Sampilo (CUNY City Tech) | The Hidden Threat Within AI Systems
2:05 PM | SC3101 | Irene Parvin (University of Northern Iowa) | Building Prevention Strategies for Technology-Facilitated Gender-Based Violence: Comparative Study from Bangladesh and the United States
2:05 PM | SC3102 | Zhiyi Chen, Pablo Rivas (Marist) | Reading Brainwaves into Images with Half the Computer Power
2:05 PM | SC3103 | Aparicio Carranza, Mohammad Newaz, Mia DeRoche (CUNY City Tech & Vaughn College) | Using AI to Detect and Mitigate Prompt Injection Attacks
2:25 PM | SC3101 | Aparicio Carranza, Mehedul Khan, Ruitao Xiong, Samuel Ajeleti (CUNY City Tech) | Analysis of Suspicious Login Activity Using Machine Learning for Cybersecurity
2:25 PM | SC3102 | Philip Lopez (IBM) | Trustworthy AI: Explainable AI Inferencing Pipelines with IBM Z
2:25 PM | SC3103 | Seth Jacobowitz (Tachiai AI) | Frontier AI Safety Governance
2:45 PM | SC3101 | Ebeneezer Amakh (ASI & Monroe University) | Hantavirus Risk Prediction AI Framework
2:45 PM | SC3102 | Aparicio Carranza, Angel Sanchez, Rizwan Choudhury, Shomik Islam (CUNY City Tech) | Access Control and Security for AI Systems
2:45 PM | SC3103 | David Eddy (Legacy Software Ltd.) | Modernizing Your Z Estate with Deterministic AI Data
`;

// All lightning talks are in SC3105, starting 2:05 PM.
// Format of each line:  order | speakers | title
export const lightningTime = "2:05 PM";
export const lightningRoom = "SC3105";
export const lightning = `
1 | Damien Morales (PMI) | The Rollout Nobody Adopts: A Leadership Playbook for Enterprise Technology Delivery
2 | Sandhya Anija, Arya Sreshtha (Marist) | MAQCC: Multi-path Adaptive Queue-aware Congestion Control
3 | Keywen Zhu (independent research) | FreeToken MLX for Apple Hardware
4 | Emmanuel Trinidad (PMI) | Integrating AI into Project Management
5 | Abdulkarim Alotaibi (Marymount) | How AI is Shaping Cyber Threat Intelligence
6 | Trevor Sullivan, Reza Sadegi, Jack Teller, Joanna Picciano, Andersen Zitulski (Marist/MIPO) | Beyond Voting History: AI-Enhanced Analysis of Voter Turnout and Contextual Factors
7 | Irvin Miller (Math & Physics Exploration) | Using AI Assist in Math Education
8 | Tyler Herlihy, Derek Paoella, Chance Hobin, Casimer DeCusatis, P. Kook (Marist & Pyxcloud) | Cybersecurity for Multi-Cloud Vibe Coded Applications
9 | John Dinicola, Ethan Korkes, Jade Spotts, Casimer DeCusatis, C. DiMarco (Marist & AgileBlue) | DMARC Analyzer: Automated Parsing and Visualization of Email Authentication for Domain Security Assessment
10 | Kyle Scott, David Leal, Travis Lemister, Casimer DeCusatis, M. Chodziuski, Peter Capek (Marist & ACM) | Cybersecurity and Red/Blue Team Testing for External USB Attached Devices
11 | Steven Jankowski, Anthony Capela, Cole Brink, Ethan Deschamps, Sirtaj Pandhir, Casimer DeCusatis, B. Zhang (Marist) | AI for SQL Injection and Pen Testing
12 | Marissa Ratschki, Miles Byrnes, Ethan Perez, Awais Razaque, Timothy Ford, Dominick Foti (Marist) | Reconnaissance Automation on the Dark Web
13 | Erick Perez, Andrew Pinhiero, Ryan Clark, Benjamin Brandt, Matthew Jones, Dominick Foti (Marist) | Design, Validation, and Automation of an Open-Source Cyber Range for SOC Training
14 | Wael Shahadeh, Luke Flood, Do Nguyen, Nuriddin Komilov, Tyler Alan, Dominic Foti (Marist) | Behavior-based macOS Malware Detection
15 | Christian Tartaglia, Andrew Lombardo, Caitlin Bartman, Owen Tamasco, Dominic Foti (Marist, The MITRE Corporation) | Threat-Centered Vulnerability Prioritization Model
16 | Harrison Carranza, Nene Gueye, Sandra Torres (CUNY Bronx Community College) | Password Management: The Future of Security
`;
