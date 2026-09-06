# Multi-stage Docker build for RozgaarX Spring Boot Backend
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY backend/pom.xml .
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Lightweight runtime image optimized for 512MB RAM free tier
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
RUN mkdir -p uploads
EXPOSE 8081
ENV PORT=8081
ENTRYPOINT ["java", "-XX:+UseSerialGC", "-Xss512k", "-Xmx380m", "-jar", "app.jar"]
