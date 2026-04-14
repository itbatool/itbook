<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/d5759f5e-6a14-45e0-bcf0-724e81b455a2" />



# ITBOOK
A microservices-based platform for student collaboration and learning resources — built with Java 21, Spring Boot, Spring Cloud, MySQL, and Docker. Students can manage their profiles, access course materials, and communicate through an in-app chat, all served through a centralized API gateway with Eureka-based service discovery.

ITBOOK was born from a real need;
Students often resort to personal messaging apps to share notes, coordinate projects, and communicate — mixing academic life with personal accounts. The idea was to give students a dedicated, privacy-focused space to collaborate and share learning resources without relying on third-party platforms.

## Features
- **User Management** — Register, login, and manage profiles with JWT authentication
- **Course Resources** — Browse and access IT learning materials and course content
- **Student Chat** — In-app messaging for student communication and collaboration
- **Service Discovery** — Eureka server for dynamic service registration and lookup
- **API Gateway** — Single entry point that routes requests across all microservices
- **Dual Deployment** — Runs via Docker Compose or directly from your IDE

## Architecture

```
[Browser]
    │
    ▼
[Frontend Service :8000]
    │
    ▼
[API Gateway :8765]
    │
    ├── user-service    :8001
    ├── course-service  :8002
    └── chat-service    :8003

[Service Registry (Eureka) :8761]  ← all services register here
[MySQL :3307]                       ← shared database (itbook_db)
```

All services share a single MySQL database (`itbook_db`), but each service only ever touches its own tables — they never query each other's data directly. Hibernate/JPA manages table creation automatically on startup via `ddl-auto=update`.

## Tech Stack
- **Backend:** Java 21, Spring Boot, Spring Cloud (Eureka + Gateway)
- **Database:** MySQL 8, Hibernate/JPA
- **Build Tool:** Maven
- **Containerization:** Docker & Docker Compose

## Requirements
- Java 21+
- Maven 3.6+
- Docker Desktop *(for Docker run)*
- MySQL 8 *(for local IDE run)*

---

## 🐳 Option A — Run with Docker

**1. Open Docker Desktop and wait until it's running**

Look for the Docker icon in your taskbar — wait until it shows "Engine running" before continuing.

**2. Clone the repository**
```bash
git clone https://github.com/itbatool/itbook.git
cd itbook
```

**3. Set up your environment file**

Copy the example and fill in your own credentials:
```bash
cp .env.example .env
```
Open `.env` and replace the placeholder values:
```env
MYSQL_DATABASE=itbook_db
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
APP_JWT_SECRET=replace-with-a-long-random-secret
```
> `.env` is gitignored — your credentials stay local and are never committed.

**4. Build the project**
```bash
mvn package -DskipTests
```

**5. Start all services**
```bash
docker-compose up --build
```
Wait about **60 seconds** for all containers to initialize.

**6. Verify and open**
- Eureka dashboard → http://localhost:8761/ *(all 5 services should appear)*
- App → http://localhost:8000/

**7. Stop and close**
```bash
docker-compose down
```
Or press `Ctrl + C` in the terminal, then close Docker Desktop.

---

## 💻 Option B — Run Locally (IDE)

**1. Create the database**

Open MySQL and run:
```sql
CREATE SCHEMA itbook_db;
```

**2. Configure credentials**

Edit `application.properties` in each of the following locations and update the default values (the part after the `:`):
- `services/user-service`
- `services/course-service`
- `services/chat-service`

Look for these lines:
```properties
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:mysql://localhost:3306/itbook_db}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:your_username}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:your_password}
```
Replace `your_username` and `your_password` with your local MySQL credentials.

> Tables are created automatically on first run — no SQL scripts needed.

**3. Start services in this order**

Run each from your IDE or via `mvn spring-boot:run`:

1. `service-registry`
2. `user-service`
3. `course-service`
4. `chat-service`
5. `frontend-service`
6. `api-gateway`

> **Shortcut (IntelliJ):** A run configuration is included in the repo. Go to **View → Tool Windows → Services → + Run Configuration -> Application**, then hit the run button to start all services at once. In practice they'll sort themselves out within 10–20 seconds even if they start simultaneously.

**4. Open the app**
- http://localhost:8000/

**5. Stop**

Stop all running services from the **Services** panel in IntelliJ, or press `Ctrl + F2` on each.

---

## Project Structure

```
itbook/
├── api-gateway/          # Spring Cloud Gateway — routes all incoming requests
├── service-registry/     # Eureka Server — service discovery and registration
├── frontend-service/     # UI layer
├── services/
│   ├── user-service/     # User registration, login, JWT auth
│   ├── course-service/   # Course content and resource management
│   └── chat-service/     # Student-to-student messaging
├── .env.example          # Environment variable template — copy to .env to start
├── docker-compose.yml    # Full multi-container setup
└── pom.xml               # Maven parent POM
```

## Author

Built by **Batool** — a Computer Science graduate exploring backend development and distributed systems architecture.  
Feel free to connect on [LinkedIn](https://www.linkedin.com/in/batool-mohammad-63b071227/) or open an issue if something isn't working!

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---
<img width="1920" height="1080" alt="1" src="https://github.com/user-attachments/assets/1a02a6fe-96d9-4a9e-9acb-ab63cd33f62d" />
<img width="1920" height="1080" alt="2" src="https://github.com/user-attachments/assets/ccd2b671-66de-4c8d-973c-054626a2e17a" />
<img width="1920" height="1080" alt="3" src="https://github.com/user-attachments/assets/5b83f623-2fa3-426c-b0f4-9ab494490080" />
