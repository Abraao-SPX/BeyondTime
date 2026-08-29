package br.com.beyondtime;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class BeyondTimeApplication {

    public static void main(String[] args) {
        SpringApplication.run(BeyondTimeApplication.class, args);
    }

    // Endpoint muito simples apenas para testarmos se o Docker e o Java subiram com sucesso
    @GetMapping("/")
    public String healthCheck() {
        return "BeyondTime API (Monolito Modular) está online e pronta!";
    }
}
