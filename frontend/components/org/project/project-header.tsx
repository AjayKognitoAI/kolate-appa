"use client";

import { FC, useState } from "react";
import { Button } from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import Header from "@/components/layout/header/Header";
import ProjectEditStepperModal from "./ProjectEditStepperModal";

interface HeaderProps {
  onProjectCreated: any;
}

const ProjectHeader: FC<HeaderProps> = ({ onProjectCreated }) => {
  const [projectModal, setProjectModal] = useState(false);

  return (
    <>
      <Header
        title={`Project`}
        subtitle="Create and manage research projects"
        rightContent={
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={() => setProjectModal(true)}
          >
            Create New Project
          </Button>
        }
      />
      {projectModal && (
        <ProjectEditStepperModal
          open={projectModal}
          onClose={() => setProjectModal(false)}
          onSave={onProjectCreated}
        />
      )}
    </>
  );
};

export default ProjectHeader;
