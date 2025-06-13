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

-- Insert sample data
INSERT INTO venues (name, street_address, city, status)
VALUES
('Burwood Woodstock Community', '10 Woodstock Ave', 'Sydney', 'active'),
('Penshurst RAIN', '22 Railway Parade', 'Sydney', 'active'),
('Older Women''s Network Newtown', '35 King Street', 'Sydney', 'active'),
('Hannaford Community Rozelle', '12 Darling Street', 'Sydney', 'active'),
('Oatley RSL Hall', '25 Letitia Street', 'Sydney', 'active'),
('The Rocks KGV Recreation Centre', '38 George Street', 'Sydney', 'active'),
('Mortdale RSL', '15 Oxford Street', 'Sydney', 'active'),
('STG Hospital Hydro Pool', '121 Princes Highway', 'Sydney', 'active'),
('Earlwood Senior Citizen Centre', '77 Homer Street', 'Sydney', 'active'),
('St John''s Ashfield', '5 Alt Street', 'Sydney', 'active'),
('Alf Kay Eastlakes', '16 Florence Avenue', 'Sydney', 'active'),
('Neighbourhood Centre Annandale', '9 Booth Street', 'Sydney', 'active'),
('Concord Seniors Centre', '30 Wellbank Street', 'Sydney', 'active'),
('Cliff Noble Alexandria', '41 Henderson Road', 'Sydney', 'active'),
('Sutherland Seniors Centre', '1 Eton Street', 'Sydney', 'active'),
('Bamul Hall Bonnyrigg', '14 Bonnyrigg Avenue', 'Sydney', 'active'),
('St Matthew''s Church Peakhurst', '13 Forest Road', 'Sydney', 'active'),
('St Mark''s Brighton-Le-Sands', '9 Princes Highway', 'Sydney', 'active'),
('ANZAC Oval Hall Engadine', '4 Old Princes Highway', 'Sydney', 'active'),
('Redfern Park', '105 Redfern Street', 'Sydney', 'active'),
('Kogarah School of Arts', '24 Bowns Road', 'Sydney', 'active'),
('St Mark Coptic Church Arncliffe', '11A Wollongong Road', 'Sydney', 'active'),
('St Helens Glebe', '19 Glebe Point Road', 'Sydney', 'active'),
('24 Gipps St Concord', '24 Gipps Street', 'Sydney', 'active'),
('Arncliffe Youth Centre', '52 Bonar Street', 'Sydney', 'active'),
('Strathfield Community Centre', '1A Bates Street', 'Sydney', 'active'),
('Caringbah Senior Citizens', '376 Port Hacking Road', 'Sydney', 'active'),
('Carlton School of Arts', '2 Carlton Parade', 'Sydney', 'active'),
('St George Community Housing', '38 Montgomery Street', 'Sydney', 'active'),
('Eastlakes Alf Kay Community', '16 Florence Avenue', 'Sydney', 'active'),
('Exodus Foundation Bexley', '180 Stoney Creek Road', 'Sydney', 'active'),
('Mortdale RSL Hall', '15 Oxford Street', 'Sydney', 'active'),
('Lewisham Park', '12 Thomas Street', 'Sydney', 'active'),
('Miranda Community Centre', '93 Karimbla Road', 'Sydney', 'active'),
('Ron Williams Community Redfern', '57 Morehead Street', 'Sydney', 'active'),
('Marrickville Enmore Park', '1A Enmore Road', 'Sydney', 'active');
