ALTER TABLE user_hobbies
    ADD CONSTRAINT IF NOT EXISTS fk_user_hobbies_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
