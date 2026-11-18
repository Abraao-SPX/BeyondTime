package br.com.beyondtime.hobby.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "hobby_categories")
public class HobbyCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Short id;

    @Column(name = "code", nullable = false, unique = true, length = 40)
    private String code;

    @Column(name = "slug", nullable = false, unique = true, length = 60)
    private String slug;

    @Column(name = "name", nullable = false, unique = true, length = 80)
    private String name;

    @Column(name = "display_order", nullable = false)
    private Short displayOrder;

    protected HobbyCategory() {
    }

    public HobbyCategory(Short id, String code, String slug, String name, Short displayOrder) {
        this.id = id;
        this.code = code;
        this.slug = slug;
        this.name = name;
        this.displayOrder = displayOrder;
    }

    public Short getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getSlug() {
        return slug;
    }

    public String getName() {
        return name;
    }

    public Short getDisplayOrder() {
        return displayOrder;
    }
}
