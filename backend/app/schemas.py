from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict

VehicleCategory = Literal["small_car", "sedan", "suv", "van", "lcv", "heavy_truck", "bus", "motorcycle", "other"]
SpecStatus = Literal["verified", "user_confirmed", "estimated", "unknown"]
DefectType = Literal["pothole", "damaged_surface", "cracked_road", "waterlogging", "damaged_edge", "obstruction", "clearance_issue", "other"]
MaintenanceStatus = Literal["open", "under_review", "inspected", "resolved"]
VerificationStatus = Literal["verified", "unverified"]

class VehicleProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    make: str
    model: str
    year: int | None = None
    variant: str = ""
    category: VehicleCategory = "other"
    lengthM: float | None = None
    widthM: float | None = None
    heightM: float | None = None
    grossVehicleWeightKg: float | None = None
    currentLoadedWeightKg: float | None = None
    specStatus: dict[str, SpecStatus] = Field(default_factory=dict)
    verificationStatus: SpecStatus = "unknown"
    sources: list[str] = Field(default_factory=list)
    isIllustrative: bool = False
    updatedAt: str | None = None
    lastVerifiedAt: str | None = None

class VehicleLookupQuery(BaseModel):
    make: str | None = None
    model: str | None = None
    year: int | None = None
    variant: str | None = None
    category: VehicleCategory | Literal[""] | None = None

class NewDefectInput(BaseModel):
    defectType: DefectType
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    severity: int = Field(ge=1, le=5)
    description: str = Field(default="", max_length=3000)
    photoUrl: str | None = None
    observedAt: str

class DefectStatusUpdate(BaseModel):
    status: MaintenanceStatus

class RouteRequest(BaseModel):
    originId: str
    destinationId: str
    vehicle: VehicleProfile | None = None
    avoidSevereDefects: bool = True
    preferBetterSurfaces: bool = True

class StatusUpdate(BaseModel):
    status: MaintenanceStatus

class InspectionInput(BaseModel):
    defectId: str
    inspectorId: str | None = None
    observedCondition: str
    notes: str = ""
    inspectedAt: str | None = None

class RepairInput(BaseModel):
    defectId: str
    status: str = "planned"
    contractor: str | None = None
    startedAt: str | None = None
    completedAt: str | None = None
    verificationEvidence: str | None = None
