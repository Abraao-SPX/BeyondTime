package br.com.beyondtime.profile.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "connection_intents")
public class ConnectionIntent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Short id;

    @Column(name = "code", nullable = false, unique = true, length = 40)
    private String code;

    @Column(name = "label", nullable = false, unique = true, length = 80)
    private String label;

    @Column(name = "icon", nullable = false, length = 20)
    private String icon;

    protected ConnectionIntent() {
    }

    public Short getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    public String getIcon() {
        return icon;
    }
}
