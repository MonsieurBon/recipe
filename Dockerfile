FROM eclipse-temurin:25.0.3_9-jre@sha256:a214efa3200af4b657e41935799aa12d7aee3336fdb42eb505a0948f6ecdd983

RUN mkdir /opt/app
COPY target/recipes*.jar /opt/app/recipes.jar

CMD ["java", "-jar", "/opt/app/recipes.jar"]
