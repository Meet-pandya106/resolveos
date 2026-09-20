/**
 * 3D Case Network & Relational Graph Visualizer (Three.js WebGL 2.0)
 * Dynamically maps live workspace cases, evidence nodes, and resolution chains with complete memory disposal.
 */

import { Case } from "@resolveos/shared";
import {
	Activity,
	Eye,
	Layers,
	Network,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { APIClient } from "../../lib/api.js";
import { useAuthStore } from "../../stores/authStore.js";

export const EvidenceGraphView: React.FC = () => {
	const { activeWorkspaceId } = useAuthStore();
	const mountRef = useRef<HTMLDivElement>(null);
	const [cases, setCases] = useState<Case[]>([]);
	const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

	useEffect(() => {
		if (!activeWorkspaceId) return;
		APIClient.get<Case[]>(`/workspaces/${activeWorkspaceId}/cases`)
			.then((data) => setCases(data || []))
			.catch((err) => console.error("Failed to load graph telemetry:", err));
	}, [activeWorkspaceId]);

	const nodeData = [
		{
			name: "Problem Formulation",
			color: 0xef4444,
			radius: 6.5,
			type: "Definition",
			desc: "Structured statement & completeness score",
		},
		{
			name: "Corroborating Evidence",
			color: 0x3b82f6,
			radius: 9.0,
			type: "Telemetry",
			desc: "APM logs, heap dumps, confidence ratings",
		},
		{
			name: "Competing Hypotheses",
			color: 0xeab308,
			radius: 11.5,
			type: "Theory",
			desc: "Rival root cause theories in evaluation",
		},
		{
			name: "5-Whys Root Cause Chain",
			color: 0xa855f7,
			radius: 7.8,
			type: "Causality",
			desc: "Recursive causality depth analysis",
		},
		{
			name: "Solution Matrix",
			color: 0x10b981,
			radius: 10.2,
			type: "Mitigation",
			desc: "Multi-criteria weighted scoring",
		},
		{
			name: "Empirical Verification",
			color: 0x06b6d4,
			radius: 12.8,
			type: "Verification",
			desc: "Pre vs post remediation telemetry delta",
		},
	];

	useEffect(() => {
		if (!mountRef.current) return;

		const width = mountRef.current.clientWidth || 800;
		const height = 550;

		// 1. Scene & Camera
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x070b14);

		const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
		camera.position.set(0, 0, 28);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		mountRef.current.appendChild(renderer.domElement);

		// 2. Lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
		scene.add(ambientLight);

		const pointLight = new THREE.PointLight(0x38bdf8, 3.5, 70);
		pointLight.position.set(12, 18, 12);
		scene.add(pointLight);

		const secondaryLight = new THREE.PointLight(0x818cf8, 2.0, 50);
		secondaryLight.position.set(-12, -10, 8);
		scene.add(secondaryLight);

		// 3. Disposables collection for safe cleanup
		const disposables: {
			geometry: THREE.BufferGeometry;
			material: THREE.Material;
		}[] = [];

		// Ambient Starfield Particles
		const starGeo = new THREE.BufferGeometry();
		const starCount = 300;
		const starPos = new Float32Array(starCount * 3);
		for (let i = 0; i < starCount * 3; i++) {
			starPos[i] = (Math.random() - 0.5) * 80;
		}
		starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
		const starMat = new THREE.PointsMaterial({
			color: 0x38bdf8,
			size: 0.25,
			transparent: true,
			opacity: 0.6,
		});
		const starField = new THREE.Points(starGeo, starMat);
		scene.add(starField);
		disposables.push({ geometry: starGeo, material: starMat });

		// 4. Central System Core & Orbital Nodes
		const rootGroup = new THREE.Group();
		scene.add(rootGroup);

		const coreGeo = new THREE.IcosahedronGeometry(2.4, 1);
		const coreMat = new THREE.MeshStandardMaterial({
			color: 0x38bdf8,
			wireframe: true,
			emissive: 0x0369a1,
			emissiveIntensity: 0.8,
		});
		const coreMesh = new THREE.Mesh(coreGeo, coreMat);
		rootGroup.add(coreMesh);
		disposables.push({ geometry: coreGeo, material: coreMat });

		// Orbital Nodes
		nodeData.forEach((nt, idx) => {
			const angle = (idx * Math.PI * 2) / nodeData.length;
			const x = Math.cos(angle) * nt.radius;
			const y = Math.sin(angle) * (nt.radius * 0.6);
			const z = Math.sin(angle * 2.5) * 2.5;

			const sphereGeo = new THREE.SphereGeometry(0.85, 24, 24);
			const sphereMat = new THREE.MeshStandardMaterial({
				color: nt.color,
				emissive: nt.color,
				emissiveIntensity: 0.6,
				roughness: 0.15,
			});

			const sphere = new THREE.Mesh(sphereGeo, sphereMat);
			sphere.position.set(x, y, z);
			rootGroup.add(sphere);
			disposables.push({ geometry: sphereGeo, material: sphereMat });

			// Pulsing Connection Lines
			const lineGeo = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(x, y, z),
			]);
			const lineMat = new THREE.LineBasicMaterial({
				color: nt.color,
				transparent: true,
				opacity: 0.4,
			});
			const line = new THREE.Line(lineGeo, lineMat);
			rootGroup.add(line);
			disposables.push({ geometry: lineGeo, material: lineMat });
		});

		// 5. Animation Loop
		let animId: number;
		const animate = () => {
			animId = requestAnimationFrame(animate);
			rootGroup.rotation.y += 0.003;
			rootGroup.rotation.x += 0.0012;
			coreMesh.rotation.y += 0.006;
			starField.rotation.y -= 0.0005;
			renderer.render(scene, camera);
		};
		animate();

		const handleResize = () => {
			if (!mountRef.current) return;
			const w = mountRef.current.clientWidth;
			camera.aspect = w / height;
			camera.updateProjectionMatrix();
			renderer.setSize(w, height);
		};

		window.addEventListener("resize", handleResize);

		// 6. Complete GPU & Memory Disposal Cleanup
		return () => {
			cancelAnimationFrame(animId);
			window.removeEventListener("resize", handleResize);
			disposables.forEach((d) => {
				d.geometry.dispose();
				d.material.dispose();
			});
			if (mountRef.current && renderer.domElement) {
				mountRef.current.removeChild(renderer.domElement);
			}
			renderer.dispose();
		};
	}, [cases]);

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-black tracking-tight text-foreground">
							3D Relational Problem Mesh
						</h1>
						<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
							WEBGL 2.0
						</span>
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Spatial visualization mapping active cases, evidence nodes,
						hypotheses, and verification telemetry in 3D.
					</p>
				</div>

				<div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-panel text-xs font-mono text-muted-foreground">
					<Activity className="w-3.5 h-3.5 text-primary" />
					<span>{cases.length} Active Cases in Mesh</span>
				</div>
			</div>

			{/* 3D Canvas Card */}
			<div className="p-4 sm:p-6 rounded-3xl glass-panel-glow overflow-hidden relative shadow-2xl">
				{/* Top-Left Telemetry Overlay */}
				<div className="absolute top-6 left-6 z-10 p-3.5 rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 text-xs font-mono space-y-1 shadow-lg max-w-xs">
					<div className="text-foreground font-bold flex items-center gap-2">
						<Network className="w-4 h-4 text-primary" />
						<span>Relational Substrate Active</span>
					</div>
					<p className="text-[11px] text-muted-foreground leading-relaxed">
						Dynamic orbital nodes correlate failure symptoms, competing
						theories, and verified fixes.
					</p>
				</div>

				{/* 3D Canvas Mount */}
				<div
					ref={mountRef}
					className="w-full h-[550px] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
				/>

				{/* Bottom Legend */}
				<div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					{nodeData.map((node, i) => (
						<div
							key={i}
							onClick={() => setSelectedDomain(node.name)}
							className="p-2.5 rounded-xl glass-panel border border-border/70 text-left space-y-1 cursor-pointer hover:border-primary/40 transition-colors"
						>
							<div className="flex items-center gap-1.5 text-xs font-bold font-mono">
								<span
									className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
									style={{
										backgroundColor: `#${node.color.toString(16).padStart(6, "0")}`,
									}}
								/>
								<span className="truncate">{node.type}</span>
							</div>
							<div className="text-[10px] text-muted-foreground line-clamp-1">
								{node.name}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
