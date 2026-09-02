FROM eclipse-temurin:25.0.4_7-jre@sha256:f9e65324a37f28209ce7dd0e5149a7aa954520ed936fb87813cf6ded2400a112

RUN mkdir /opt/app
COPY target/recipes*.jar /opt/app/recipes.jar

CMD ["java", "-jar", "/opt/app/recipes.jar"]
