-- Create terms table
CREATE TABLE terms (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    fiscal_year INTEGER NOT NULL,
    term_number INTEGER NOT NULL CHECK (term_number BETWEEN 1 AND 4),
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    number_of_weeks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(fiscal_year, term_number, day_of_week)
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON terms
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp(); 