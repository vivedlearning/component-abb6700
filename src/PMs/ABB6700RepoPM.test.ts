import { describe, it, expect, beforeEach } from "vitest";
import { AppObjectRepo, makeAppObjectRepo } from "@vived/core";
import { makeABB6700Repo } from "../Entities/ABB6700Repo";
import {
  ABB6700RepoPM,
  ABB6700RepoVM,
  makeABB6700RepoPM,
} from "./ABB6700RepoPM";

describe("ABB6700RepoPM", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
  });

  it("projects existing entities into initial VM", () => {
    const repoAppObject = appObjects.getOrCreate("ABB6700s");
    const repo = makeABB6700Repo(repoAppObject);
    repo.createABB6700Entity("arm-a");
    repo.createABB6700Entity("arm-b");

    const pm = makeABB6700RepoPM(repoAppObject);
    const viewObserver = vi.fn();

    pm.addView(viewObserver);

    expect(viewObserver).toHaveBeenCalledTimes(1);
    const vm = viewObserver.mock.calls[0][0] as ABB6700RepoVM;
    expect(vm.entityIds.sort()).toEqual(["arm-a", "arm-b"]);
  });

  it("updates VM when entities are added and removed", () => {
    const repoAppObject = appObjects.getOrCreate("ABB6700s");
    const repo = makeABB6700Repo(repoAppObject);
    const pm = makeABB6700RepoPM(repoAppObject);
    const viewObserver = vi.fn();

    pm.addView(viewObserver);
    viewObserver.mockClear();

    repo.createABB6700Entity("arm-a");
    repo.createABB6700Entity("arm-b");
    repo.deleteABB6700Entity("arm-a");

    const lastVM = viewObserver.mock.calls[
      viewObserver.mock.calls.length - 1
    ][0] as ABB6700RepoVM;

    expect(lastVM.entityIds).toEqual(["arm-b"]);
  });

  it("compares VMs using sorted entityIds", () => {
    const repoAppObject = appObjects.getOrCreate("ABB6700s");
    makeABB6700Repo(repoAppObject);
    const pm = makeABB6700RepoPM(repoAppObject);

    expect(
      pm.vmsAreEqual(
        { entityIds: ["b", "a"] },
        { entityIds: ["a", "b"] },
      ),
    ).toBe(true);

    expect(
      pm.vmsAreEqual(
        { entityIds: ["a"] },
        { entityIds: ["a", "b"] },
      ),
    ).toBe(false);
  });

  it("removes repo observer during disposal", () => {
    const repoAppObject = appObjects.getOrCreate("ABB6700s");
    const repo = makeABB6700Repo(repoAppObject);
    const removeObserverSpy = vi.spyOn(repo, "removeChangeObserver");

    const pm = makeABB6700RepoPM(repoAppObject);
    pm.dispose();

    expect(removeObserverSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  it("provides static getters", () => {
    const repoAppObject = appObjects.getOrCreate("ABB6700s");
    makeABB6700Repo(repoAppObject);
    const pm = makeABB6700RepoPM(repoAppObject);

    expect(ABB6700RepoPM.get(repoAppObject)).toBe(pm);
    expect(ABB6700RepoPM.getById("ABB6700s", appObjects)).toBe(pm);
  });
});
