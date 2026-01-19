CREATE TABLE user_bookmark (
    bookmark_id UUID PRIMARY KEY,
    bookmarked_by VARCHAR(255) NOT NULL,
    project_id UUID NOT NULL,
    trial_slug VARCHAR(255) NOT NULL,
    execution_id VARCHAR(255),
    bookmarked_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_user_bookmark_bookmarked_by ON user_bookmark (bookmarked_by);
CREATE INDEX idx_user_bookmark_project_id ON user_bookmark (project_id);
CREATE INDEX idx_user_bookmark_trial_slug ON user_bookmark (trial_slug);
