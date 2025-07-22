/**
 * Firebase-Graph Bridge for OneMap
 * 
 * This module provides a dual-write approach where data is stored in both
 * Firebase (for UI and real-time updates) and a graph database (for 
 * relationship queries and network analysis).
 */

import { Firestore, collection, addDoc, updateDoc, doc, onSnapshot } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';

// Graph database interface (can be Neo4j, ArangoDB, or custom implementation)
interface GraphDatabase {
  createNode(label: string, properties: any): Promise<string>;
  createRelationship(fromId: string, relationship: string, toId: string, properties?: any): Promise<void>;
  query(cypher: string, params?: any): Promise<any[]>;
  updateNode(id: string, properties: any): Promise<void>;
  deleteNode(id: string): Promise<void>;
}

// OneMap entity types based on our ontology
interface PoleNode {
  id: string;
  firebase_id: string;
  status: 'approved' | 'installed' | 'maintenance' | 'decommissioned';
  location: { lat: number, lng: number };
  installed_date?: Date;
  capacity: number;
}

interface DropNode {
  id: string;
  firebase_id: string;
  status: 'planned' | 'installed' | 'active' | 'inactive';
  address: string;
  installation_date?: Date;
}

interface PropertyNode {
  id: string;
  firebase_id: string;
  owner?: string;
  address: string;
  property_type: 'residential' | 'commercial' | 'industrial';
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseGraphBridge {
  
  constructor(
    private firestore: Firestore,
    private graphDb: GraphDatabase
  ) {}

  /**
   * Create a new pole in both Firebase and Graph database
   */
  async createPole(poleData: Omit<PoleNode, 'firebase_id'>): Promise<string> {
    try {
      // 1. Create in Firebase first (for UI consistency)
      const firebaseDoc = await addDoc(collection(this.firestore, 'poles'), {
        pole_number: poleData.id,
        status: poleData.status,
        location: poleData.location,
        installed_date: poleData.installed_date,
        capacity: poleData.capacity || 12,
        created_at: new Date()
      });

      // 2. Create in Graph database with Firebase reference
      const graphNodeId = await this.graphDb.createNode('Pole', {
        ...poleData,
        firebase_id: firebaseDoc.id
      });

      // 3. Update Firebase with graph reference (for debugging)
      await updateDoc(doc(this.firestore, 'poles', firebaseDoc.id), {
        graph_id: graphNodeId
      });

      return firebaseDoc.id;
    } catch (error) {
      console.error('Error creating pole:', error);
      throw error;
    }
  }

  /**
   * Create a drop and establish relationship with pole
   */
  async createDrop(dropData: Omit<DropNode, 'firebase_id'>, poleId: string): Promise<string> {
    try {
      // Validate pole capacity before creating drop
      const poleConnections = await this.graphDb.query(
        'MATCH (p:Pole {id: $poleId})-[:SERVES]->(d:Drop) RETURN COUNT(d) as count',
        { poleId }
      );
      
      if (poleConnections[0]?.count >= 12) {
        throw new Error(`Pole ${poleId} is at maximum capacity (12 drops)`);
      }

      // 1. Create in Firebase
      const firebaseDoc = await addDoc(collection(this.firestore, 'drops'), {
        drop_number: dropData.id,
        pole_ref: poleId,
        status: dropData.status,
        address: dropData.address,
        installation_date: dropData.installation_date,
        created_at: new Date()
      });

      // 2. Create in Graph database
      const graphNodeId = await this.graphDb.createNode('Drop', {
        ...dropData,
        firebase_id: firebaseDoc.id
      });

      // 3. Create relationship: Pole SERVES Drop
      await this.graphDb.createRelationship(poleId, 'SERVES', dropData.id, {
        connection_date: new Date()
      });

      return firebaseDoc.id;
    } catch (error) {
      console.error('Error creating drop:', error);
      throw error;
    }
  }

  /**
   * Create property and connect to drop
   */
  async createProperty(propertyData: Omit<PropertyNode, 'firebase_id'>, dropId: string): Promise<string> {
    try {
      // Validate drop is not already connected
      const existingConnections = await this.graphDb.query(
        'MATCH (d:Drop {id: $dropId})-[:CONNECTS_TO]->(p:Property) RETURN COUNT(p) as count',
        { dropId }
      );

      if (existingConnections[0]?.count > 0) {
        throw new Error(`Drop ${dropId} is already connected to a property`);
      }

      // 1. Create in Firebase
      const firebaseDoc = await addDoc(collection(this.firestore, 'properties'), {
        property_id: propertyData.id,
        drop_ref: dropId,
        owner: propertyData.owner,
        address: propertyData.address,
        property_type: propertyData.property_type || 'residential',
        created_at: new Date()
      });

      // 2. Create in Graph database
      const graphNodeId = await this.graphDb.createNode('Property', {
        ...propertyData,
        firebase_id: firebaseDoc.id
      });

      // 3. Create relationship: Drop CONNECTS_TO Property
      await this.graphDb.createRelationship(dropId, 'CONNECTS_TO', propertyData.id);

      return firebaseDoc.id;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  /**
   * Complex relationship queries using graph database
   */
  async getNetworkImpact(poleId: string): Promise<any> {
    return this.graphDb.query(`
      MATCH (p:Pole {id: $poleId})-[:SERVES]->(d:Drop)-[:CONNECTS_TO]->(prop:Property)
      RETURN p.id as pole, 
             COUNT(d) as drops_affected, 
             COLLECT(d.id) as drop_ids,
             COUNT(prop) as properties_affected,
             COLLECT(prop.owner) as affected_customers
    `, { poleId });
  }

  async getCapacityAnalysis(): Promise<any> {
    return this.graphDb.query(`
      MATCH (p:Pole)-[r:SERVES]->(d:Drop) 
      WITH p, COUNT(r) as drop_count 
      WHERE drop_count > (p.capacity * 0.8)
      RETURN p.id, 
             drop_count, 
             p.capacity, 
             (p.capacity - drop_count) as remaining_capacity,
             ROUND((drop_count * 100.0 / p.capacity)) as utilization_percent
      ORDER BY utilization_percent DESC
    `);
  }

  async findOrphanedInfrastructure(): Promise<any> {
    return this.graphDb.query(`
      MATCH (d:Drop) 
      WHERE NOT (d)<-[:SERVES]-(:Pole {status: 'active'})
      RETURN d.id, d.address, d.status
    `);
  }

  /**
   * Data validation using graph constraints
   */
  async validateDataIntegrity(): Promise<{ isValid: boolean, issues: any[] }> {
    const issues = [];

    // Check for poles exceeding capacity
    const overCapacityPoles = await this.graphDb.query(`
      MATCH (p:Pole)-[:SERVES]->(d:Drop) 
      WITH p, COUNT(d) as drop_count 
      WHERE drop_count > p.capacity 
      RETURN p.id, drop_count, p.capacity
    `);
    if (overCapacityPoles.length > 0) {
      issues.push({ type: 'capacity_exceeded', poles: overCapacityPoles });
    }

    // Check for duplicate connections
    const duplicateConnections = await this.graphDb.query(`
      MATCH (prop:Property)<-[:CONNECTS_TO]-(d:Drop)
      WITH prop, COUNT(d) as drop_count, COLLECT(d.id) as connected_drops
      WHERE drop_count > 1
      RETURN prop.id, drop_count, connected_drops
    `);
    if (duplicateConnections.length > 0) {
      issues.push({ type: 'duplicate_connections', properties: duplicateConnections });
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Sync existing Firebase data to graph database
   */
  async syncFirebaseToGraph(): Promise<void> {
    // This would be used for initial migration
    // Implementation depends on your current Firebase structure
    console.log('Starting Firebase to Graph sync...');
    
    // 1. Sync poles
    // 2. Sync drops with relationships
    // 3. Sync properties with relationships
    // 4. Validate all relationships
    
    console.log('Sync completed');
  }

  /**
   * Real-time sync listener
   */
  setupRealTimeSync(): void {
    // Listen to Firebase changes and update graph accordingly
    onSnapshot(collection(this.firestore, 'poles'), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          // Sync new pole to graph
        } else if (change.type === 'modified') {
          // Update graph node
        } else if (change.type === 'removed') {
          // Remove from graph
        }
      });
    });
  }
}

/**
 * Example usage:
 * 
 * const bridge = new FirebaseGraphBridge(firestore, graphDb);
 * 
 * // Create infrastructure
 * await bridge.createPole({ id: 'LAW.P.B167', status: 'installed', location: {lat: -26.1, lng: 28.0} });
 * await bridge.createDrop({ id: 'DR1234', status: 'active', address: '74 Main St' }, 'LAW.P.B167');
 * 
 * // Complex queries
 * const impact = await bridge.getNetworkImpact('LAW.P.B167');
 * const capacity = await bridge.getCapacityAnalysis();
 * 
 * // Validation
 * const validation = await bridge.validateDataIntegrity();
 */