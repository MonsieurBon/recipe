FROM eclipse-temurin:21

RUN mkdir /opt/app
COPY target/recipe*.jar /opt/app/recipe.jar

CMD ["java", "-jar", "/opt/app/recipe.jar"]
