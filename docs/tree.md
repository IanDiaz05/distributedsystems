.
├── application
│   ├── Dockerfile
│   ├── index.js
│   ├── init-db.js
│   └── package.json
├── database
│   └── catalog.sql
├── docker-compose.yml
├── ESTRATEGIA-HA-DR.md
├── haproxy
│   ├── application-backup.cfg
│   ├── application.cfg
│   ├── application-master.cfg
│   ├── presentation-backup.cfg
│   ├── presentation.cfg
│   ├── presentation-entry.cfg
│   └── presentation-master.cfg
├── keepalived
│   ├── application-backup.conf
│   ├── application-master.conf
│   ├── check-haproxy.sh
│   ├── Dockerfile
│   ├── presentation-backup.conf
│   └── presentation-master.conf
├── nagios
│   └── architecture.cfg
├── README.md
├── resilience-lab
│   ├── ab
│   │   ├── Dockerfile
│   │   └── run.sh
│   ├── chaosmonkey
│   │   ├── chaosmonkey.py
│   │   ├── Dockerfile
│   │   └── run.sh
│   ├── dashboard
│   │   ├── app.py
│   │   ├── Dockerfile
│   │   └── static
│   │       ├── app.js
│   │       ├── index.html
│   │       └── style.css
│   ├── docker-compose.yml
│   ├── jmeter
│   │   ├── Dockerfile
│   │   └── run.sh
│   ├── README.md
│   ├── siege
│   │   ├── Dockerfile
│   │   └── run.sh
│   └── TEST-PLAN.md
├── ToDo.md
├── tree.md
└── web
    ├── catalog.css
    ├── catalog.js
    ├── nginx.conf
    ├── site1
    │   └── index.html
    ├── site2
    │   └── index.html
    └── site3
        └── index.html

17 directories, 47 files
