# ==========================================
# ESTÁGIO 1: CONSTRUÇÃO (BUILD)
# ==========================================
# Usamos uma imagem que já tem o Maven e o Java 21 instalados.
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Primeiro copiamos apenas o pom.xml e baixamos as dependências.
# Isso deixa o Docker muito mais rápido em futuras alterações.
COPY pom.xml .
RUN mvn dependency:go-offline

# Agora copiamos o nosso código fonte
COPY src ./src

# Pedimos para o Maven compilar o projeto (gera o arquivo .jar)
RUN mvn clean package -DskipTests

# ==========================================
# ESTÁGIO 2: EXECUÇÃO (RUN)
# ==========================================
# Para rodar, não precisamos do Maven pesado, apenas do Java JRE limpo.
FROM eclipse-temurin:21-jre
WORKDIR /app

# Pegamos o arquivo .jar gerado no Estágio 1 e colocamos aqui
COPY --from=build /app/target/beyondtime-backend-0.0.1-SNAPSHOT.jar app.jar

# Liberamos a porta 8080 para o mundo externo acessar o Java
EXPOSE 8080

# Comando que liga o servidor Spring Boot
CMD ["java", "-jar", "app.jar"]
