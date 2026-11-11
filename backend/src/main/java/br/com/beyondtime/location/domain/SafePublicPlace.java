package br.com.beyondtime.location.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "safe_public_places")
public class SafePublicPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "city_id", nullable = false)
    private City city;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "neighborhood_id")
    private Neighborhood neighborhood;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "description", nullable = false, length = 255)
    private String description;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected SafePublicPlace() {
    }

    public SafePublicPlace(Integer id, City city, Neighborhood neighborhood, String name, String category, String description, boolean active) {
        this.id = id;
        this.city = city;
        this.neighborhood = neighborhood;
        this.name = name;
        this.category = category;
        this.description = description;
        this.active = active;
    }

    public Integer getId() {
        return id;
    }

    public City getCity() {
        return city;
    }

    public Neighborhood getNeighborhood() {
        return neighborhood;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public boolean isActive() {
        return active;
    }
}
