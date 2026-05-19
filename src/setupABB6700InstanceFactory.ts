import { AppObjectRepo } from "@vived/core";
import { ABB6700Entity, makeABB6700Entity } from "./Entities/ABB6700Entity";
import { ABB6700Repo } from "./Entities/ABB6700Repo";
import { makeABB6700PM } from "./PMs/ABB6700PM";
import { makeCalcStabilizerUC } from "./UCs/CalcStabilizerUC";
import { makeSetJointAngleUC } from "./UCs/SetJointAngleUC";
import { makeSetPoseUC } from "./UCs/SetPoseUC";
import { makeABB6700BabylonView } from "./Views/ABB6700BabylonView";

/**
 * Per-instance factory that creates Entity + PM for each component instance
 * and registers itself on the ABB6700Repo.
 */
export function setupABB6700InstanceFactory(appObjects: AppObjectRepo): void {
  const repo = ABB6700Repo.get(appObjects);
  if (!repo) {
    appObjects.submitError(
      "setupABB6700InstanceFactory",
      "ABB6700Repo not found",
    );
    return;
  }

  repo.aBB6700EntityFactory = function (id: string): ABB6700Entity {
    const ao = appObjects.getOrCreate(id);
    const entity = makeABB6700Entity(ao);
    makeSetJointAngleUC(ao);
    makeSetPoseUC(ao);
    makeCalcStabilizerUC(ao);
    makeABB6700PM(ao);
    makeABB6700BabylonView(ao);
    return entity;
  };
}
