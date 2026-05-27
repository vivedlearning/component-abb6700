import {
  AppObject,
  AppObjectEntityRepo,
  AppObjectRepo,
  generateUniqueID,
  getSingletonComponent,
} from "@vived/core";
import { ABB6700Entity, makeABB6700Entity } from "./ABB6700Entity";

/** Factory function type for creating ABB6700Entity instances */
export type ABB6700EntityFactory = (id: string) => ABB6700Entity;

/**
 * ABB6700Repo
 *
 * Singleton repository managing all ABB 6700 instances.
 * Provides creation, deletion, and lookup for component entities.
 */
export abstract class ABB6700Repo extends AppObjectEntityRepo<ABB6700Entity> {
  static readonly type = "ABB6700Repo";

  /** Injectable factory for creating entities with associated components */
  abstract aBB6700EntityFactory: ABB6700EntityFactory;

  /** Create a new entity instance, optionally with a specific ID */
  abstract createABB6700Entity(id?: string): ABB6700Entity;

  /** Delete an entity by its AppObject ID */
  abstract deleteABB6700Entity(id: string): void;

  /**
   * Global accessor for the singleton repository
   */
  static get(appObjects: AppObjectRepo): ABB6700Repo | undefined {
    return getSingletonComponent<ABB6700Repo>(ABB6700Repo.type, appObjects);
  }

  /**
   * Ensures a ABB6700Repo exists, creating one if needed
   */
  static addIfMissing(appObjects: AppObjectRepo): ABB6700Repo {
    const existing = ABB6700Repo.get(appObjects);
    if (existing) {
      return existing;
    } else {
      const appObject = appObjects.getOrCreate("ABB6700Repo");
      return makeABB6700Repo(appObject);
    }
  }
}

/**
 * Factory function to create a new ABB6700Repo
 */
export function makeABB6700Repo(appObject: AppObject): ABB6700Repo {
  return new ABB6700RepoImp(appObject);
}

class ABB6700RepoImp extends ABB6700Repo {
  aBB6700EntityFactory: ABB6700EntityFactory = (id: string) => {
    const ao = this.appObjects.getOrCreate(id);
    return makeABB6700Entity(ao);
  };

  createABB6700Entity(id?: string): ABB6700Entity {
    const entityId = id ?? generateUniqueID();
    const entity = this.aBB6700EntityFactory(entityId);
    this.add(entity);
    return entity;
  }

  deleteABB6700Entity(id: string): void {
    const entity = this.getForAppObject(id);
    if (!entity) return;

    entity.appObject.dispose();
    this.removeForAppObject(id);
  }

  constructor(appObject: AppObject) {
    super(appObject, ABB6700Repo.type);
    this.appObjects.registerSingleton(this);
  }
}
