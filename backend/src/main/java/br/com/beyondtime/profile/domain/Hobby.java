package br.com.beyondtime.profile.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.Locale;

@Entity
@Table(name = "hobbies")
public class Hobby {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "category_id", nullable = false)
    private Short categoryId;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "slug", length = 60)
    private String slug;

    @Column(name = "name", nullable = false, unique = true, length = 80)
    private String name;

    @Column(name = "icon", nullable = false, length = 30)
    private String icon;

    protected Hobby() {
    }

    public Hobby(Integer id, Short categoryId, String code, String name, String icon, String slug) {
        this.id = id;
        this.categoryId = categoryId;
        this.code = code;
        this.name = name;
        this.icon = icon;
        this.slug = slug;
    }

    public Integer getId() {
        return id;
    }

    public Short getCategoryId() {
        return categoryId;
    }

    public String getCode() {
        return code;
    }

    public String getSlug() {
        return slug != null ? slug : (code != null ? code.toLowerCase(Locale.ROOT).replace('_', '-') : null);
    }

    public String getName() {
        return name;
    }

    public String getIcon() {
        return icon;
    }
}
