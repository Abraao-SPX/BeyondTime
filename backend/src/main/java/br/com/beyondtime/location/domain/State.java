package br.com.beyondtime.location.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "states")
public class State {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Short id;

    @Column(name = "uf", nullable = false, unique = true, length = 2, columnDefinition = "bpchar(2)")
    private String uf;

    @Column(name = "name", nullable = false, unique = true, length = 60)
    private String name;

    protected State() {
    }

    public State(Short id, String uf, String name) {
        this.id = id;
        this.uf = uf;
        this.name = name;
    }

    public Short getId() {
        return id;
    }

    public String getUf() {
        return uf;
    }

    public String getName() {
        return name;
    }
}
