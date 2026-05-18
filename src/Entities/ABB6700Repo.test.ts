import { describe, it, expect, beforeEach } from "vitest";
import { AppObject, AppObjectRepo, makeAppObjectRepo } from "@vived/core";
import { makeABB6700Entity } from "./ABB6700Entity";
import { ABB6700Repo, makeABB6700Repo } from "./ABB6700Repo";

describe("ABB6700Repo", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
  });

  describe("Singleton Repository Pattern", () => {
    it("creates a singleton repository", () => {
      const appObject = appObjects.getOrCreate("ABB6700Repo");
      const repo = makeABB6700Repo(appObject);

      expect(repo).toBeDefined();
      expect(repo.appObject.id).toBe("ABB6700Repo");
    });

    it("registers itself as a singleton during construction", () => {
      const appObject = appObjects.getOrCreate("ABB6700Repo");
      const repo = makeABB6700Repo(appObject);

      const retrieved = ABB6700Repo.get(appObjects);
      expect(retrieved).toBe(repo);
    });
  });

  describe("Static Helper Methods", () => {
    describe("get()", () => {
      it("returns undefined when repository doesn't exist", () => {
        const result = ABB6700Repo.get(appObjects);
        expect(result).toBeUndefined();
      });

      it("returns the repository when it exists", () => {
        const appObject = appObjects.getOrCreate("ABB6700Repo");
        const repo = makeABB6700Repo(appObject);
        const result = ABB6700Repo.get(appObjects);
        expect(result).toBe(repo);
      });
    });

    describe("addIfMissing()", () => {
      it("creates new repository when none exists", () => {
        const repo = ABB6700Repo.addIfMissing(appObjects);

        expect(repo).toBeDefined();
        expect(repo.appObject.id).toBe("ABB6700Repo");
        expect(ABB6700Repo.get(appObjects)).toBe(repo);
      });

      it("returns existing repository when it already exists", () => {
        const appObject = appObjects.getOrCreate("ABB6700Repo");
        const originalRepo = makeABB6700Repo(appObject);
        const retrievedRepo = ABB6700Repo.addIfMissing(appObjects);

        expect(retrievedRepo).toBe(originalRepo);
      });
    });
  });

  describe("CRUD Operations", () => {
    let repo: ABB6700Repo;

    beforeEach(() => {
      repo = ABB6700Repo.addIfMissing(appObjects);
    });

    describe("createABB6700Entity()", () => {
      it("creates a new entity with generated ID when no ID provided", () => {
        const entity = repo.createABB6700Entity();

        expect(entity).toBeDefined();
        expect(entity.j1.degrees).toBe(0);
        expect(entity.appObject.id).toBeDefined();
        expect(entity.appObject.id.length).toBeGreaterThan(0);
      });

      it("creates a new entity with specified ID", () => {
        const entity = repo.createABB6700Entity("custom-arm-id");

        expect(entity).toBeDefined();
        expect(entity.appObject.id).toBe("custom-arm-id");
        expect(entity.j1.degrees).toBe(0);
      });

      it("adds created entity to repository", () => {
        const entity = repo.createABB6700Entity("test-arm");
        const retrieved = repo.getForAppObject("test-arm");

        expect(retrieved).toBe(entity);
      });

      it("creates multiple independent entities", () => {
        const entity1 = repo.createABB6700Entity("arm-1");
        const entity2 = repo.createABB6700Entity("arm-2");

        expect(entity1).not.toBe(entity2);
        expect(entity1.appObject.id).toBe("arm-1");
        expect(entity2.appObject.id).toBe("arm-2");
      });

      it("uses the factory function to create entities", () => {
        const mockFactory = vi.fn().mockImplementation((id: string) => {
          const ao = appObjects.getOrCreate(id);
          return makeABB6700Entity(ao);
        });

        repo.aBB6700EntityFactory = mockFactory;
        const entity = repo.createABB6700Entity("test-arm");

        expect(mockFactory).toHaveBeenCalledWith("test-arm");
        expect(entity).toBeDefined();
      });
    });

    describe("deleteABB6700Entity()", () => {
      it("deletes an existing entity", () => {
        const entity = repo.createABB6700Entity("test-arm");
        expect(repo.getForAppObject("test-arm")).toBe(entity);

        repo.deleteABB6700Entity("test-arm");
        expect(repo.getForAppObject("test-arm")).toBeUndefined();
      });

      it("handles deletion of non-existent entity gracefully", () => {
        expect(() => repo.deleteABB6700Entity("non-existent")).not.toThrow();
      });

      it("disposes the AppObject when deleting entity", () => {
        const entity = repo.createABB6700Entity("test-arm");
        const disposeSpy = vi.spyOn(entity.appObject, "dispose");

        repo.deleteABB6700Entity("test-arm");
        expect(disposeSpy).toHaveBeenCalledOnce();
      });

      it("maintains independence when deleting one of multiple entities", () => {
        repo.createABB6700Entity("arm-1");
        const entity2 = repo.createABB6700Entity("arm-2");

        repo.deleteABB6700Entity("arm-1");

        expect(repo.getForAppObject("arm-1")).toBeUndefined();
        expect(repo.getForAppObject("arm-2")).toBe(entity2);
      });
    });
  });

  describe("Observer Pattern and Change Notifications", () => {
    let repo: ABB6700Repo;

    beforeEach(() => {
      repo = ABB6700Repo.addIfMissing(appObjects);
    });

    it("notifies observers when entities are added", () => {
      const observer = vi.fn();
      repo.addChangeObserver(observer);

      repo.createABB6700Entity("test-arm");
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when entities are removed", () => {
      const observer = vi.fn();
      repo.createABB6700Entity("test-arm");

      repo.addChangeObserver(observer);
      repo.deleteABB6700Entity("test-arm");

      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("allows observer removal", () => {
      const observer = vi.fn();
      repo.addChangeObserver(observer);
      repo.removeChangeObserver(observer);

      repo.createABB6700Entity("test-arm");
      expect(observer).not.toHaveBeenCalled();
    });
  });
});
