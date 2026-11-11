package br.com.beyondtime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class BeyondTimeApplicationTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldExecuteFlywayMigrationsAndSeedDatabase() {
        Integer appliedMigrations = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE success = true", Integer.class);
        Integer statesCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM states WHERE uf = 'SE'", Integer.class);
        Integer citiesCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM cities", Integer.class);
        Integer hobbiesCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM hobbies", Integer.class);
        Integer icebreakersCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM icebreaker_templates", Integer.class);

        assertThat(appliedMigrations).isGreaterThanOrEqualTo(2);
        assertThat(statesCount).isEqualTo(1);
        assertThat(citiesCount).isEqualTo(8);
        assertThat(hobbiesCount).isEqualTo(15);
        assertThat(icebreakersCount).isEqualTo(13);
    }
}
