FROM eclipse-temurin:21
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-Xms256m", "-Xmx512m", "-XX:+UseG1GC", "-jar", "app.jar"]