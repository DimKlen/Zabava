# Image de l'API Zabava, multi-architecture (amd64 et arm64 : Oracle Ampere).

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
# Couche à part : les dépendances ne sont retéléchargées que si le build change.
RUN ./gradlew --no-daemon -q dependencies > /dev/null
COPY src src
RUN ./gradlew --no-daemon -q bootJar && cp build/libs/*-SNAPSHOT.jar app.jar

FROM eclipse-temurin:21-jre
RUN useradd --system --no-create-home zabava
WORKDIR /app
COPY --from=build /src/app.jar app.jar
USER zabava
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["java", "-jar", "app.jar"]
