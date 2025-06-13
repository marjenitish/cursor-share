CREATE TYPE venue_status AS ENUM ('active', 'inactive');

CREATE TABLE venues (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    street_address TEXT NOT NULL,
    city TEXT NOT NULL,
    status venue_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON venues
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();