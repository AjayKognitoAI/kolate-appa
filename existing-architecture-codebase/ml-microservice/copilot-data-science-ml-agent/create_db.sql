-- Create the database for the data science agent
CREATE DATABASE data_science_agent
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_United States.1252'
    LC_CTYPE = 'English_United States.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Connect to the new database
\c data_science_agent;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE data_science_agent TO postgres;
