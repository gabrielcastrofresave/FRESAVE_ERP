import { useRef, useEffect, useState } from "react";

type VehicleType = "truck" | "van" | "car" | "machine" | "default";

function detectVehicleType(tipo: string, marca?: string): VehicleType {
  const t = (tipo || "").toLowerCase();
  const m = (marca || "").toLowerCase();
  if (t.includes("caminhão") || t.includes("camiao") || t.includes("semi") || t.includes("truck") || m.includes("volvo") || m.includes("scania") || m.includes("man") || m.includes("daf") || m.includes("mercedes-benz actros") || m.includes("iveco stralis")) {
    return "truck";
  }
  if (t.includes("van") || t.includes("furgão") || t.includes("furgao") || t.includes("transit")) {
    return "van";
  }
  if (t.includes("maquina") || t.includes("máquina") || t.includes("reboque") || t.includes("trailer")) {
    return "machine";
  }
  return "car";
}

// ── CSS 3D Vehicle using perspective transforms ──────────────────────────────

interface VehicleProps {
  rotateY: number;
  color: string;
  glassColor: string;
}

function TruckShape({ rotateY, color, glassColor }: VehicleProps) {
  const dark = "rgba(0,0,0,0.35)";
  const light = "rgba(255,255,255,0.15)";
  return (
    <div
      style={{
        width: 280,
        height: 160,
        position: "relative",
        transform: `perspective(600px) rotateY(${rotateY}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Trailer body */}
      <div style={{
        position: "absolute",
        left: 60, top: 30,
        width: 200, height: 90,
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 70%, black) 100%)`,
        borderRadius: "4px 4px 0 0",
        border: "1.5px solid rgba(0,0,0,0.3)",
        boxShadow: `inset 0 4px 8px ${light}, inset 0 -4px 6px ${dark}`,
      }} />
      {/* Cab */}
      <div style={{
        position: "absolute",
        left: 0, top: 40,
        width: 72, height: 80,
        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 85%, white) 0%, ${color} 50%, color-mix(in srgb, ${color} 65%, black) 100%)`,
        borderRadius: "8px 4px 0 0",
        border: "1.5px solid rgba(0,0,0,0.3)",
        boxShadow: `inset 0 4px 10px ${light}, inset 0 -4px 6px ${dark}`,
      }}>
        {/* Windshield */}
        <div style={{
          position: "absolute",
          left: 8, top: 8,
          width: 45, height: 30,
          background: `linear-gradient(135deg, ${glassColor} 0%, color-mix(in srgb, ${glassColor} 60%, white) 100%)`,
          borderRadius: 4,
          border: "1px solid rgba(0,0,0,0.2)",
        }} />
        {/* Side mirror */}
        <div style={{
          position: "absolute",
          left: -8, top: 16,
          width: 8, height: 5,
          background: "rgba(200,200,200,0.8)",
          borderRadius: 2,
        }} />
        {/* Headlight */}
        <div style={{
          position: "absolute",
          left: 4, top: 50,
          width: 16, height: 8,
          background: "rgba(255,240,120,0.95)",
          borderRadius: 3,
          boxShadow: "0 0 6px rgba(255,220,0,0.8)",
        }} />
      </div>
      {/* Chassis */}
      <div style={{
        position: "absolute",
        left: 0, top: 120,
        width: 260, height: 14,
        background: "#444",
        borderRadius: "2px",
      }} />
      {/* Wheels */}
      {[12, 48, 170, 210].map((x, i) => (
        <div key={i} style={{
          position: "absolute",
          left: x, top: 118,
          width: 30, height: 30,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #666, #1a1a1a)",
          border: "3px solid #333",
          boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: "translate(-50%,-50%)",
            width: 10, height: 10,
            borderRadius: "50%",
            background: "#aaa",
          }} />
        </div>
      ))}
      {/* Exhaust pipe */}
      <div style={{
        position: "absolute",
        left: 68, top: 22,
        width: 6, height: 20,
        background: "#555",
        borderRadius: 3,
      }} />
    </div>
  );
}

function CarShape({ rotateY, color, glassColor }: VehicleProps) {
  const dark = "rgba(0,0,0,0.3)";
  const light = "rgba(255,255,255,0.2)";
  return (
    <div
      style={{
        width: 260,
        height: 130,
        position: "relative",
        transform: `perspective(600px) rotateY(${rotateY}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Body */}
      <div style={{
        position: "absolute",
        left: 10, top: 55,
        width: 240, height: 60,
        background: `linear-gradient(160deg, ${color} 0%, color-mix(in srgb, ${color} 75%, black) 100%)`,
        borderRadius: "6px 6px 4px 4px",
        border: "1.5px solid rgba(0,0,0,0.25)",
        boxShadow: `inset 0 4px 10px ${light}, inset 0 -4px 8px ${dark}`,
      }} />
      {/* Cabin roof */}
      <div style={{
        position: "absolute",
        left: 55, top: 22,
        width: 145, height: 42,
        background: `linear-gradient(160deg, color-mix(in srgb, ${color} 90%, white) 0%, ${color} 100%)`,
        borderRadius: "12px 12px 0 0",
        border: "1.5px solid rgba(0,0,0,0.2)",
        boxShadow: `inset 0 4px 8px ${light}`,
      }} />
      {/* Front windshield */}
      <div style={{
        position: "absolute",
        left: 185, top: 28,
        width: 38, height: 32,
        background: `linear-gradient(135deg, ${glassColor} 0%, color-mix(in srgb, ${glassColor} 50%, white) 100%)`,
        borderRadius: "3px 10px 0 0",
        border: "1px solid rgba(0,0,0,0.15)",
        transform: "skewX(-10deg)",
      }} />
      {/* Rear windshield */}
      <div style={{
        position: "absolute",
        left: 57, top: 28,
        width: 38, height: 32,
        background: `linear-gradient(135deg, ${glassColor} 0%, color-mix(in srgb, ${glassColor} 50%, white) 100%)`,
        borderRadius: "10px 3px 0 0",
        border: "1px solid rgba(0,0,0,0.15)",
        transform: "skewX(10deg)",
      }} />
      {/* Side windows */}
      {[100, 135].map((x, i) => (
        <div key={i} style={{
          position: "absolute",
          left: x, top: 30,
          width: 30, height: 28,
          background: `linear-gradient(135deg, ${glassColor} 0%, color-mix(in srgb, ${glassColor} 50%, white) 100%)`,
          border: "1px solid rgba(0,0,0,0.15)",
          borderRadius: 2,
        }} />
      ))}
      {/* Headlights */}
      <div style={{ position: "absolute", left: 224, top: 72, width: 18, height: 10, background: "rgba(255,240,120,0.95)", borderRadius: 3, boxShadow: "0 0 8px rgba(255,220,0,0.7)" }} />
      {/* Taillights */}
      <div style={{ position: "absolute", left: 14, top: 72, width: 14, height: 10, background: "rgba(255,60,60,0.9)", borderRadius: 3, boxShadow: "0 0 6px rgba(255,0,0,0.5)" }} />
      {/* Wheels */}
      {[28, 185].map((x, i) => (
        <div key={i} style={{
          position: "absolute",
          left: x, top: 96,
          width: 36, height: 36,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #666, #1a1a1a)",
          border: "3px solid #333",
          boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
        }}>
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "#aaa" }} />
        </div>
      ))}
    </div>
  );
}

function MachineShape({ rotateY, color, glassColor }: VehicleProps) {
  const dark = "rgba(0,0,0,0.3)";
  const light = "rgba(255,255,255,0.15)";
  return (
    <div
      style={{
        width: 280,
        height: 160,
        position: "relative",
        transform: `perspective(600px) rotateY(${rotateY}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Platform / chassis */}
      <div style={{
        position: "absolute",
        left: 0, top: 100,
        width: 280, height: 30,
        background: "#555",
        borderRadius: 4,
        boxShadow: `inset 0 -4px 6px ${dark}`,
      }} />
      {/* Cabin block */}
      <div style={{
        position: "absolute",
        left: 20, top: 30,
        width: 90, height: 75,
        background: `linear-gradient(145deg, ${color} 0%, color-mix(in srgb, ${color} 65%, black) 100%)`,
        borderRadius: "6px 6px 0 0",
        border: "1.5px solid rgba(0,0,0,0.3)",
        boxShadow: `inset 0 4px 10px ${light}`,
      }}>
        <div style={{ position: "absolute", left: 10, top: 10, width: 50, height: 35, background: `linear-gradient(135deg, ${glassColor} 0%, color-mix(in srgb, ${glassColor} 60%, white) 100%)`, borderRadius: 4, border: "1px solid rgba(0,0,0,0.2)" }} />
      </div>
      {/* Arm / boom */}
      <div style={{
        position: "absolute",
        left: 95, top: 10,
        width: 130, height: 20,
        background: `linear-gradient(90deg, color-mix(in srgb, ${color} 80%, black) 0%, ${color} 50%, color-mix(in srgb, ${color} 80%, black) 100%)`,
        borderRadius: 6,
        transform: "rotate(-15deg)",
        transformOrigin: "left center",
        border: "1.5px solid rgba(0,0,0,0.25)",
        boxShadow: `inset 0 3px 6px ${light}`,
      }} />
      {/* Bucket */}
      <div style={{
        position: "absolute",
        right: 18, top: 0,
        width: 40, height: 30,
        background: "#888",
        borderRadius: "0 0 8px 8px",
        border: "1.5px solid #666",
      }} />
      {/* Tracks/Wheels */}
      {[10, 100, 195].map((x, i) => (
        <div key={i} style={{
          position: "absolute",
          left: x, top: 118,
          width: 38, height: 38,
          borderRadius: i === 0 || i === 2 ? "50%" : "4px",
          background: i === 1 ? "#333" : "radial-gradient(circle at 35% 35%, #666, #1a1a1a)",
          border: "3px solid #222",
          boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
        }}>
          {(i === 0 || i === 2) && <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "#aaa" }} />}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Vehicle3DModelProps {
  tipo?: string;
  marca?: string;
  modelo?: string;
  status?: string;
  className?: string;
}

const STATUS_COLORS: Record<string, { body: string; glass: string; label: string }> = {
  disponivel: { body: "#16a34a", glass: "rgba(134,239,172,0.7)", label: "Disponível" },
  em_uso:     { body: "#2563eb", glass: "rgba(147,197,253,0.7)", label: "Em Uso" },
  manutencao: { body: "#d97706", glass: "rgba(253,230,138,0.7)", label: "Em Manutenção" },
  avaria:     { body: "#dc2626", glass: "rgba(252,165,165,0.7)", label: "Avaria" },
  default:    { body: "#6366f1", glass: "rgba(196,181,253,0.7)", label: "" },
};

export function Vehicle3DModel({ tipo = "", marca = "", modelo = "", status = "disponivel", className = "" }: Vehicle3DModelProps) {
  const [rotateY, setRotateY] = useState(0);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const pausedAtRef = useRef(0);

  useEffect(() => {
    const speed = 0.4; // degrees per ms / 16
    let lastTs = 0;

    const animate = (ts: number) => {
      if (!pausedRef.current) {
        const delta = lastTs ? ts - lastTs : 0;
        setRotateY((prev) => (prev + speed * (delta / 16)) % 360);
      }
      lastTs = ts;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleMouseEnter = () => {
    pausedRef.current = true;
  };
  const handleMouseLeave = () => {
    pausedRef.current = false;
  };

  const vehicleType = detectVehicleType(tipo, marca);
  const colors = STATUS_COLORS[status] || STATUS_COLORS.default;

  const sharedProps = { rotateY, color: colors.body, glassColor: colors.glass };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title="Passe o rato para pausar a rotação"
    >
      {/* 3D scene */}
      <div
        style={{
          width: 300,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at 50% 60%, rgba(99,102,241,0.08) 0%, transparent 70%)",
          borderRadius: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ground shadow */}
        <div style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 220,
          height: 18,
          background: "radial-gradient(ellipse, rgba(0,0,0,0.18) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />

        {vehicleType === "truck" && <TruckShape {...sharedProps} />}
        {(vehicleType === "car" || vehicleType === "van") && <CarShape {...sharedProps} />}
        {(vehicleType === "machine" || vehicleType === "default") && <MachineShape {...sharedProps} />}
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colors.body }} />
        {marca && modelo ? `${marca} ${modelo}` : tipo || "Veículo"}
        {colors.label && (
          <span className="px-1.5 py-0.5 rounded text-white text-xs" style={{ background: colors.body }}>
            {colors.label}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">Passe o rato para pausar</p>
    </div>
  );
}
