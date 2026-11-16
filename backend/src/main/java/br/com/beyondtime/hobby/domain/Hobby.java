package br.com.beyondtime.hobby.domain;

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
@Table(name = "hobbies")
public class Hobby {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private HobbyCategory category;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "slug", nullable = false, unique = true, length = 60)
    private String slug;

    @Column(name = "name", nullable = false, unique = true, length = 80)
    private String name;

    @Column(name = "icon", nullable = false, length = 30)
    private String icon;

    @Column(name = "active", nullable = false)
    private boolean active;

    protected Hobby() {
    }

    public Hobby(Integer id, HobbyCategory category, String code, String slug, String name, String icon, boolean active) {
        this.id = id;
        this.category = category;
        this.code = code;
        this.slug = slug;
        this.name = name;
        this.icon = icon;
        this.active = active;
    }

    public Integer getId() {
        return id;
    }

    public HobbyCategory getCategory() {
        return category;
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

    public String getIcon() {
        return icon;
    }

    public boolean isActive() {
        return active;
    }
}
