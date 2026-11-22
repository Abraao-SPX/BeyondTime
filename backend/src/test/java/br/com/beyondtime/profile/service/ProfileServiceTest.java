package br.com.beyondtime.profile.service;

import br.com.beyondtime.location.repository.CityRepository;
import br.com.beyondtime.profile.domain.Hobby;
import br.com.beyondtime.profile.repository.ConnectionIntentRepository;
import br.com.beyondtime.profile.repository.HobbyRepository;
import br.com.beyondtime.profile.repository.ProfileHobbyRepository;
import br.com.beyondtime.profile.repository.ProfileIntentRepository;
import br.com.beyondtime.profile.repository.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private ProfileRepository profileRepository;
    @Mock
    private HobbyRepository hobbyRepository;
    @Mock
    private ProfileHobbyRepository profileHobbyRepository;
    @Mock
    private ConnectionIntentRepository connectionIntentRepository;
    @Mock
    private ProfileIntentRepository profileIntentRepository;
    @Mock
    private CityRepository cityRepository;

    private ProfileService profileService;

    private List<Hobby> catalog;
    private Hobby dancaSalao;
    private Hobby dancaContemporanea;
    private Hobby culinariaRegional;

    @BeforeEach
    void setUp() {
        profileService = new ProfileService(
                profileRepository,
                hobbyRepository,
                profileHobbyRepository,
                connectionIntentRepository,
                profileIntentRepository,
                cityRepository
        );

        dancaSalao = new Hobby(10, (short) 1, "DANCA_SALAO", "Dança de Salão", "music", "danca-de-salao");
        dancaContemporanea = new Hobby(11, (short) 1, "DANCA_CONTEMPORANEA", "Dança Contemporânea", "music", "danca-contemporanea");
        culinariaRegional = new Hobby(12, (short) 4, "CULINARIA_REGIONAL", "Culinária Regional", "utensils", "culinaria-regional");

        catalog = List.of(dancaSalao, dancaContemporanea, culinariaRegional);
    }

    @Test
    void shouldMatchHobbiesExactlyAndNotCollapseSharedPrefix() {
        // SEC-MED-06: Preservação de hobbies distintos com prefixo compartilhado
        Hobby match1 = profileService.matchHobby("Dança de Salão", catalog);
        assertThat(match1).isNotNull();
        assertThat(match1.getId()).isEqualTo(10);
        assertThat(match1.getName()).isEqualTo("Dança de Salão");

        Hobby match2 = profileService.matchHobby("Dança Contemporânea", catalog);
        assertThat(match2).isNotNull();
        assertThat(match2.getId()).isEqualTo(11);
        assertThat(match2.getName()).isEqualTo("Dança Contemporânea");

        // Correspondência sem acentos
        Hobby matchSemAcentos = profileService.matchHobby("Danca Contemporanea", catalog);
        assertThat(matchSemAcentos).isNotNull();
        assertThat(matchSemAcentos.getId()).isEqualTo(11);

        // Correspondência por slug
        Hobby matchSlug = profileService.matchHobby("danca-de-salao", catalog);
        assertThat(matchSlug).isNotNull();
        assertThat(matchSlug.getId()).isEqualTo(10);

        // Correspondência por ID
        Hobby matchId = profileService.matchHobby("11", catalog);
        assertThat(matchId).isNotNull();
        assertThat(matchId.getId()).isEqualTo(11);

        // Prefixo isolado ambíguo não deve colapsar arbitrariamente
        Hobby matchAmbiguo = profileService.matchHobby("Dança", catalog);
        assertThat(matchAmbiguo).isNull();
    }
}
