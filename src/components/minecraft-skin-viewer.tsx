'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MinecraftSkinViewerProps {
  username: string;
  uuid?: string;
  // Initial settings from database (user's saved preferences)
  initialAnimation?: 'walking' | 'running' | 'idle' | 'none';
  initialAutoRotate?: boolean;
  initialRotateSpeed?: number;
  initialZoom?: number;
  initialAnimationSpeed?: number;
  initialShowNameTag?: boolean;
}

type AnimationType = 'walking' | 'running' | 'idle' | 'none';

export function MinecraftSkinViewer({
  username,
  uuid,
  initialAnimation = 'walking',
  initialAutoRotate = true,
  initialRotateSpeed = 0.5,
  initialZoom = 0.9,
  initialAnimationSpeed = 1,
  initialShowNameTag = false,
}: MinecraftSkinViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings state - initialized from props (user's saved preferences)
  const [animation, setAnimation] = useState<AnimationType>(initialAnimation);
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);
  const [rotateSpeed, setRotateSpeed] = useState(initialRotateSpeed);
  const [zoom, setZoom] = useState(initialZoom);
  const [showNameTag, setShowNameTag] = useState(initialShowNameTag);
  const [enableZoom, setEnableZoom] = useState(true);
  const [enableRotate, setEnableRotate] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(initialAnimationSpeed);

  // Initialize viewer
  useEffect(() => {
    let skin3d: any;

    const initViewer = async () => {
      if (!containerRef.current) return;

      try {
        skin3d = await import('skin3d');

        // Clear any existing content
        containerRef.current.innerHTML = '';

        // Create a canvas element - skin3d.View expects a canvas for WebGL
        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 400;
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        containerRef.current.appendChild(canvas);

        // Skin URL using Minotar (CORS-friendly) for WebGL textures
        // Both UUID and username routes work with Minotar
        const skinUrl = uuid
          ? `https://minotar.net/skin/${uuid}`
          : `https://minotar.net/skin/${username}`;

        // Create viewer using skin3d.View with canvas element
        const viewer = new skin3d.View({
          canvas: canvas,
          width: 280,
          height: 400,
          skin: skinUrl,
        });

        // Set default settings
        viewer.autoRotate = true;
        viewer.animation = new skin3d.WalkingAnimation();

        // Store reference
        viewerRef.current = viewer;
        setIsLoaded(true);

      } catch (error) {
        console.error('Failed to initialize skin viewer:', error);
        // Fallback to static image
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <img 
              src="https://mc-heads.net/body/${username}/280" 
              alt="${username}'s skin"
              style="margin: 0 auto; display: block;"
            />
          `;
        }
      }
    };

    initViewer();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose?.();
      }
    };
  }, [username, uuid]);

  // Update animation
  useEffect(() => {
    if (!viewerRef.current || !isLoaded) return;

    const loadAnimation = async () => {
      const skin3d = await import('skin3d');

      switch (animation) {
        case 'walking':
          viewerRef.current.animation = new skin3d.WalkingAnimation();
          break;
        case 'running':
          viewerRef.current.animation = new skin3d.RunningAnimation();
          break;
        case 'idle':
          viewerRef.current.animation = new skin3d.IdleAnimation();
          break;
        case 'none':
          viewerRef.current.animation = null;
          break;
      }

      if (viewerRef.current.animation) {
        viewerRef.current.animation.speed = animationSpeed;
      }
    };

    loadAnimation();
  }, [animation, isLoaded]);

  // Update animation speed
  useEffect(() => {
    if (!viewerRef.current?.animation || !isLoaded) return;
    viewerRef.current.animation.speed = animationSpeed;
  }, [animationSpeed, isLoaded]);

  // Update auto rotate
  useEffect(() => {
    if (!viewerRef.current || !isLoaded) return;
    viewerRef.current.autoRotate = autoRotate;
  }, [autoRotate, isLoaded]);

  // Update rotate speed
  useEffect(() => {
    if (!viewerRef.current || !isLoaded) return;
    viewerRef.current.autoRotateSpeed = rotateSpeed;
  }, [rotateSpeed, isLoaded]);

  // Update zoom
  useEffect(() => {
    if (!viewerRef.current || !isLoaded) return;
    viewerRef.current.zoom = zoom;
  }, [zoom, isLoaded]);

  // Update controls
  useEffect(() => {
    if (!viewerRef.current?.controls || !isLoaded) return;
    viewerRef.current.controls.enableZoom = enableZoom;
    viewerRef.current.controls.enableRotate = enableRotate;
  }, [enableZoom, enableRotate, isLoaded]);

  // Update name tag
  useEffect(() => {
    if (!viewerRef.current || !isLoaded) return;
    viewerRef.current.nameTag = showNameTag ? username : null;
  }, [showNameTag, username, isLoaded]);

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Minecraft Skin</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3D Viewer Container */}
        <div
          ref={containerRef}
          className="flex items-center justify-center min-h-[400px] bg-background/50 rounded-lg"
        />

        {/* Customization Settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleContent className="space-y-4 pt-4 border-t border-border/50">
            {/* Animation Type */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Animation</Label>
              <Select value={animation} onValueChange={(v: string) => setAnimation(v as AnimationType)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walking">Walking</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Animation Speed */}
            {animation !== 'none' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Animation Speed: {animationSpeed.toFixed(1)}x</Label>
                <Slider
                  value={[animationSpeed]}
                  onValueChange={([v]: number[]) => setAnimationSpeed(v)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}

            {/* Auto Rotate */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Auto Rotate</Label>
              <Switch checked={autoRotate} onCheckedChange={setAutoRotate} />
            </div>

            {/* Rotate Speed */}
            {autoRotate && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Rotate Speed: {rotateSpeed.toFixed(1)}</Label>
                <Slider
                  value={[rotateSpeed]}
                  onValueChange={([v]: number[]) => setRotateSpeed(v)}
                  min={0.1}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}

            {/* Zoom Level */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Zoom: {zoom.toFixed(1)}x</Label>
              <Slider
                value={[zoom]}
                onValueChange={([v]: number[]) => setZoom(v)}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Enable Zoom Control</Label>
              <Switch checked={enableZoom} onCheckedChange={setEnableZoom} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Enable Rotate Control</Label>
              <Switch checked={enableRotate} onCheckedChange={setEnableRotate} />
            </div>

            {/* Name Tag */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Show Name Tag</Label>
              <Switch checked={showNameTag} onCheckedChange={setShowNameTag} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
