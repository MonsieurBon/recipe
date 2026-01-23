FROM eclipse-temurin:21

RUN mkdir /opt/app
COPY target/recipes*.jar /opt/app/recipes.jar

CMD ["java", "-jar", "/opt/app/recipes.jar"]
