import { Button, Container, Flex, Text, useDisclosure } from "@chakra-ui/react";
import { useRouter } from "next/router";
import CreateVoterModal from "../../../components/modals/CreateVoter";
import { api } from "../../../utils/api";

const DashboardVoter = () => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const election = api.election.getBySlug.useQuery(
    router.query.electionSlug as string,
    {
      enabled: router.isReady,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    }
  );

  const voters = api.election.getElectionVoter.useQuery(
    router.query.electionSlug as string,
    {
      enabled: router.isReady,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    }
  );

  const removeVoterMutation = api.voter.removeSingle.useMutation({
    onSuccess: async () => {
      await voters.refetch();
    },
  });

  if (election.isLoading) return <Text>Loading...</Text>;

  if (election.isError) return <Text>Error: {election.error.message}</Text>;

  if (!election.data) return <Text>No election found</Text>;

  return (
    <Container maxW="4xl">
      <CreateVoterModal
        isOpen={isOpen}
        electionId={election.data.id}
        onClose={async () => {
          await voters.refetch();
          onClose();
        }}
      />
      <Button onClick={onOpen}>Add voter</Button>
      <Text>{election.data.name} - voter page</Text>

      {voters.isLoading ? (
        <Text>Loading...</Text>
      ) : voters.isError ? (
        <Text>Error: {voters.error.message}</Text>
      ) : !voters.data.invitedVoter.length && !voters.data.voters.length ? (
        <Text>No voters found</Text>
      ) : (
        <>
          {voters.data.voters.map((voter) => (
            <Flex key={voter.id}>
              <Text>{voter.user.email}</Text>

              <Button
                onClick={() =>
                  election.data &&
                  removeVoterMutation.mutate({
                    electionId: election.data.id,
                    voterId: voter.id,
                    isInvitedVoter: false,
                  })
                }
                isLoading={removeVoterMutation.isLoading}
              >
                Delete
              </Button>
            </Flex>
          ))}
          {voters.data.invitedVoter.map((voter) => (
            <Flex key={voter.id}>
              <Text>
                {voter.email} ({voter.status})
              </Text>

              <Button
                onClick={() =>
                  election.data &&
                  removeVoterMutation.mutate({
                    electionId: election.data.id,
                    voterId: voter.id,
                    isInvitedVoter: true,
                  })
                }
                isLoading={removeVoterMutation.isLoading}
              >
                Delete
              </Button>
            </Flex>
          ))}
        </>
      )}
    </Container>
  );
};

export default DashboardVoter;
