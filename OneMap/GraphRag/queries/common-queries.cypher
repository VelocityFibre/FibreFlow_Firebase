-- OneMap Common Graph Queries
-- These queries address frequent OneMap analysis needs

-- 1. NETWORK IMPACT ANALYSIS
-- Find all infrastructure affected by pole maintenance/failure
MATCH (p:Pole {id: $pole_id})-[:SERVES]->(d:Drop)-[:CONNECTS_TO]->(prop:Property)
RETURN p.id as pole, 
       COUNT(d) as drops_affected, 
       COLLECT(d.id) as drop_ids,
       COUNT(prop) as properties_affected,
       COLLECT(prop.owner) as affected_customers;

-- 2. CAPACITY PLANNING  
-- Find poles approaching capacity (>80% full)
MATCH (p:Pole)-[r:SERVES]->(d:Drop) 
WITH p, COUNT(r) as drop_count 
WHERE drop_count > (p.capacity * 0.8)
RETURN p.id, 
       drop_count, 
       p.capacity, 
       (p.capacity - drop_count) as remaining_capacity,
       ROUND((drop_count * 100.0 / p.capacity)) as utilization_percent
ORDER BY utilization_percent DESC;

-- 3. ORPHANED INFRASTRUCTURE DETECTION
-- Find drops not connected to active poles
MATCH (d:Drop) 
WHERE NOT (d)<-[:SERVES]-(:Pole {status: 'active'})
RETURN d.id, d.address, d.status;

-- Find properties without drop connections
MATCH (prop:Property)
WHERE NOT (prop)<-[:CONNECTS_TO]-(:Drop)
RETURN prop.id, prop.address, prop.owner;

-- 4. DUPLICATE DETECTION
-- Find properties with multiple drop connections (should be 1:1)
MATCH (prop:Property)<-[:CONNECTS_TO]-(d:Drop)
WITH prop, COUNT(d) as drop_count, COLLECT(d.id) as connected_drops
WHERE drop_count > 1
RETURN prop.id, prop.address, drop_count, connected_drops;

-- Find drops serving multiple properties (should be 1:1)  
MATCH (d:Drop)-[:CONNECTS_TO]->(prop:Property)
WITH d, COUNT(prop) as prop_count, COLLECT(prop.id) as connected_properties
WHERE prop_count > 1
RETURN d.id, d.address, prop_count, connected_properties;

-- 5. GEOGRAPHIC ANALYSIS
-- Infrastructure density by suburb
MATCH (p:Pole)-[:SERVES]->(d:Drop)-[:CONNECTS_TO]->(prop:Property)-[:LOCATED_AT]->(addr:Address)
WITH addr.suburb as suburb, 
     COUNT(DISTINCT p) as poles, 
     COUNT(d) as drops, 
     COUNT(prop) as properties
RETURN suburb, poles, drops, properties, 
       ROUND((drops * 1.0 / poles)) as avg_drops_per_pole
ORDER BY drops DESC;

-- 6. PERFORMANCE MONITORING
-- Find poles with unusual connection patterns
MATCH (p:Pole)-[:SERVES]->(d:Drop)
WITH p, COUNT(d) as drop_count
WHERE drop_count = 0 OR drop_count > 10
RETURN p.id, p.status, drop_count,
       CASE 
         WHEN drop_count = 0 THEN 'No connections'
         WHEN drop_count > 10 THEN 'High utilization' 
       END as flag;

-- 7. NETWORK TOPOLOGY ANALYSIS
-- Find critical poles (serving many properties)
MATCH (p:Pole)-[:SERVES]->(d:Drop)-[:CONNECTS_TO]->(prop:Property)
WITH p, COUNT(DISTINCT prop) as property_count
WHERE property_count > 8
RETURN p.id, p.location, property_count
ORDER BY property_count DESC;

-- 8. STATUS TRACKING
-- Properties by connection status
MATCH (prop:Property)<-[:CONNECTS_TO]-(d:Drop)<-[:SERVES]-(p:Pole)
WITH prop, d.status as drop_status, p.status as pole_status
RETURN drop_status, pole_status, COUNT(prop) as property_count
ORDER BY drop_status, pole_status;

-- 9. MAINTENANCE PLANNING
-- Find all infrastructure requiring attention
MATCH (p:Pole {status: 'maintenance'})-[:SERVES]->(d:Drop)-[:CONNECTS_TO]->(prop:Property)
RETURN p.id as pole_needing_maintenance,
       COUNT(d) as drops_affected,
       COUNT(prop) as customers_affected,
       COLLECT(DISTINCT prop.owner) as affected_customers;

-- 10. NETWORK EXPANSION ANALYSIS
-- Find areas with properties but no drop connections (expansion opportunities)
MATCH (prop:Property)-[:LOCATED_AT]->(addr:Address)
WHERE NOT (prop)<-[:CONNECTS_TO]-(:Drop)
WITH addr.suburb as suburb, COUNT(prop) as unconnected_properties
WHERE unconnected_properties > 5
RETURN suburb, unconnected_properties
ORDER BY unconnected_properties DESC;

-- 11. DATA QUALITY CHECKS
-- Find inconsistent address data
MATCH (d:Drop)-[:CONNECTS_TO]->(prop:Property)-[:LOCATED_AT]->(addr:Address)
WHERE d.address <> prop.address OR prop.address <> addr.street_name + ' ' + addr.street_number
RETURN d.id, d.address as drop_address, prop.address as property_address, 
       addr.street_number + ' ' + addr.street_name as normalized_address;

-- 12. HISTORICAL ANALYSIS
-- Track infrastructure changes over time
MATCH (old)-[:REPLACED_BY]->(new)
RETURN old.id as old_infrastructure, 
       new.id as new_infrastructure,
       old.__type__ as infrastructure_type,
       old.replacement_date as replacement_date,
       old.reason as replacement_reason
ORDER BY replacement_date DESC;

-- 13. CUSTOMER IMPACT REPORTS
-- Generate customer notification list for pole work
MATCH (p:Pole {id: $pole_id})-[:SERVES]->(d:Drop)-[:CONNECTS_TO]->(prop:Property)
WHERE prop.owner IS NOT NULL
RETURN DISTINCT prop.owner as customer_name,
       prop.address as customer_address,
       d.id as drop_id,
       'Scheduled maintenance on pole ' + p.id as notification_reason;

-- 14. NETWORK HEALTH DASHBOARD
-- Overall network statistics
MATCH (p:Pole) 
OPTIONAL MATCH (p)-[:SERVES]->(d:Drop)
OPTIONAL MATCH (d)-[:CONNECTS_TO]->(prop:Property)
RETURN COUNT(DISTINCT p) as total_poles,
       COUNT(DISTINCT d) as total_drops, 
       COUNT(DISTINCT prop) as total_properties,
       AVG(SIZE((p)-[:SERVES]->())) as avg_drops_per_pole,
       COUNT(p {status: 'active'}) as active_poles,
       COUNT(d {status: 'active'}) as active_drops;