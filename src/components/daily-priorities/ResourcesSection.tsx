/**
 * ResourcesSection - Displays permanent team resources
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useResources } from '@/hooks/useResources';
import AddResourceModal from './AddResourceModal';
import EditResourceModal from './EditResourceModal';
import { Resource } from '@/types/resources';

export default function ResourcesSection() {
  const { resources, isLoading, addResource, updateResource, deleteResource } = useResources();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete resource "${title}"?`)) {
      deleteResource(id);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="py-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Team Resources</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1 h-7 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {resources.length === 0 ? (
            <div className="text-center py-3 text-muted-foreground">
              <p className="text-xs">No resources added yet</p>
              <Button
                variant="link"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-1 h-auto py-1 text-xs"
              >
                Add your first resource
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-2 py-2 px-2 rounded border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {resource.resource_type === 'url' && resource.url ? (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-xs text-blue-600 hover:underline truncate block leading-tight"
                            title={resource.title}
                          >
                            {resource.title}
                          </a>
                        ) : (
                          <h4 className="font-medium text-xs truncate leading-tight" title={resource.title}>{resource.title}</h4>
                        )}
                        {resource.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-tight" title={resource.description}>
                            {resource.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0 -mt-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingResource(resource)}
                          className="h-6 w-6"
                          title="Edit resource"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(resource.id, resource.title)}
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          title="Delete resource"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddResourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addResource}
      />

      <EditResourceModal
        isOpen={!!editingResource}
        onClose={() => setEditingResource(null)}
        onSave={updateResource}
        resource={editingResource}
      />
    </>
  );
}
