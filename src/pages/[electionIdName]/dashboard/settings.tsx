import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  Spinner,
  Stack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Text,
  Flex,
  Select,
  FormErrorMessage,
} from "@chakra-ui/react";
import {
  collection,
  query,
  where,
  updateDoc,
  doc,
  getDocs,
  arrayRemove,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  NextPage,
} from "next";
import Head from "next/head";
import { useState } from "react";
import { electionType } from "../../../types/typings";
import { firestore } from "../../../firebase/firebase";
import DashboardLayout from "../../../layout/DashboardLayout";
import { TrashIcon } from "@heroicons/react/24/outline";
import { getSession } from "next-auth/react";
import reloadSession from "../../../utils/reloadSession";
import isElectionIdNameExists from "../../../utils/isElectionIdNameExists";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Session } from "next-auth";
import isElectionOngoing from "../../../utils/isElectionOngoing";

interface SettingsPageProps {
  election: electionType;
  session: Session;
}
const SettingsPage = ({ election, session }: SettingsPageProps) => {
  const {
    isOpen: isOpenDelete,
    onOpen: onOpenDelete,
    onClose: onCloseDelete,
  } = useDisclosure();
  const [initialElection, setInitialElection] =
    useState<electionType>(election);

  const initialState = {
    name: initialElection.name,
    electionIdName: initialElection.electionIdName,
    electionStartDate: initialElection.electionStartDate,
    electionEndDate: initialElection.electionEndDate,
    publicity: initialElection.publicity,
  };

  const [settings, setSettings] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(
    new Date(settings.electionStartDate?.seconds * 1000) || null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    new Date(settings.electionEndDate?.seconds * 1000) || null
  );
  return (
    <>
      <Head>
        <title>Settings | eBoto Mo</title>
      </Head>
      <DashboardLayout title="Settings" session={session}>
        {!election ? (
          <Spinner />
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);

              if (
                !settings.name.trim() ||
                !settings.electionIdName.trim() ||
                !settings.electionStartDate ||
                !settings.electionEndDate ||
                !settings.publicity ||
                !startDate ||
                !endDate ||
                (startDate.toString() ===
                  new Date(
                    initialElection.electionStartDate.seconds * 1000
                  ).toString() &&
                  endDate.toString() ===
                    new Date(
                      initialElection.electionEndDate.seconds * 1000
                    ).toString() &&
                  settings.name.trim() === initialElection.name.trim() &&
                  settings.electionIdName.trim() ===
                    initialElection.electionIdName.trim() &&
                  settings.publicity === initialElection.publicity)
              ) {
                return;
              }

              if (
                settings.electionIdName.trim() !==
                initialElection.electionIdName.trim()
              ) {
                // Check if electionIdName is already taken
                if (await isElectionIdNameExists(election.electionIdName)) {
                  setError("Election ID Name is already taken");
                  setLoading(false);
                  return;
                }
              }

              await updateDoc(
                doc(firestore, "elections", initialElection.uid),
                {
                  ...settings,
                  electionStartDate: Timestamp.fromDate(startDate),
                  electionEndDate: Timestamp.fromDate(endDate),
                  updatedAt: Timestamp.now(),
                }
              ).then(() => {
                setInitialElection({
                  ...initialElection,
                  ...settings,
                  electionStartDate: Timestamp.fromDate(startDate),
                  electionEndDate: Timestamp.fromDate(endDate),
                });
              });
              setLoading(false);
            }}
          >
            <Stack alignItems="flex-start" spacing={6}>
              <FormControl isRequired>
                <FormLabel>Election Name</FormLabel>
                <Input
                  placeholder={initialElection.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSettings({
                      ...settings,
                      name: e.target.value,
                    });
                  }}
                  value={settings.name}
                />
              </FormControl>
              <FormControl isRequired isInvalid={!!error}>
                <FormLabel>Election ID Name</FormLabel>
                <InputGroup borderColor={error ? "red.400" : ""}>
                  <InputLeftAddon pointerEvents="none" userSelect="none">
                    eboto-mo.com/
                  </InputLeftAddon>
                  <Input
                    placeholder={initialElection.electionIdName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setSettings({
                        ...settings,
                        electionIdName: e.target.value.toLocaleLowerCase(),
                      });
                      setError(null);
                    }}
                    value={settings.electionIdName}
                  />
                </InputGroup>
                {error && <FormErrorMessage>{error}</FormErrorMessage>}
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Election Date</FormLabel>

                <DatePicker
                  disabled={isElectionOngoing(
                    initialElection.electionStartDate,
                    initialElection.electionEndDate
                  )}
                  selected={startDate}
                  minDate={new Date()}
                  onChange={(date) => {
                    date ? setStartDate(date) : setStartDate(null);
                    setEndDate(null);
                  }}
                  filterTime={(time) => {
                    const currentDate = new Date();
                    const selectedDate = new Date(time);
                    return currentDate.getTime() < selectedDate.getTime();
                  }}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                  disabledKeyboardNavigation
                  withPortal
                  isClearable={
                    !isElectionOngoing(
                      initialElection.electionStartDate,
                      initialElection.electionEndDate
                    )
                  }
                  placeholderText="Select election start date"
                />
                <DatePicker
                  disabled={
                    !startDate ||
                    isElectionOngoing(
                      initialElection.electionStartDate,
                      initialElection.electionEndDate
                    )
                  }
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  minDate={startDate}
                  filterTime={(time) => {
                    const selectedDate = new Date(time);
                    return startDate
                      ? startDate.getTime() < selectedDate.getTime()
                      : new Date().getTime() < selectedDate.getTime();
                  }}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                  disabledKeyboardNavigation
                  withPortal
                  isClearable={
                    !isElectionOngoing(
                      initialElection.electionStartDate,
                      initialElection.electionEndDate
                    )
                  }
                  placeholderText="Select election end date"
                  highlightDates={startDate ? [startDate] : []}
                />
                <FormHelperText>
                  You can&apos;t change the dates once the election is ongoing.
                </FormHelperText>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Election Publicity</FormLabel>
                <Select
                  value={settings.publicity}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setSettings({
                      ...settings,
                      publicity: e.target.value as
                        | "private"
                        | "voters"
                        | "public",
                    });
                  }}
                >
                  <option value="private">Private</option>
                  <option value="voters">Voters</option>
                  <option value="public">Public</option>
                </Select>
              </FormControl>

              <Modal isOpen={isOpenDelete} onClose={onCloseDelete}>
                <ModalOverlay />
                <ModalContent>
                  <ModalHeader>Delete {election.name}</ModalHeader>
                  <ModalCloseButton />
                  <ModalBody>
                    <Text>
                      Are you sure you want to delete this election? This
                      process cannot be undone.
                    </Text>
                  </ModalBody>

                  <ModalFooter>
                    <Button
                      mr={3}
                      onClick={onCloseDelete}
                      disabled={deleteLoading}
                    >
                      Close
                    </Button>
                    <Button
                      leftIcon={<TrashIcon width={16} />}
                      variant="outline"
                      color="red.400"
                      borderColor="red.400"
                      isLoading={deleteLoading}
                      onClick={async () => {
                        setDeleteLoading(true);

                        const batch = writeBatch(firestore);
                        session &&
                          batch.update(
                            doc(firestore, "admins", session.user.uid),
                            {
                              elections: arrayRemove(election.uid),
                            }
                          );
                        await batch.commit();

                        reloadSession();
                        onCloseDelete();
                        setDeleteLoading(false);
                      }}
                    >
                      Delete
                    </Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
              <Flex justifyContent="space-between" width="full">
                <Button
                  leftIcon={<TrashIcon width={16} />}
                  variant="outline"
                  color="red.400"
                  borderColor="red.400"
                  onClick={() => onOpenDelete()}
                  isLoading={deleteLoading}
                >
                  Delete Election
                </Button>

                <Button
                  type="submit"
                  isLoading={loading}
                  disabled={
                    !settings.name.trim() ||
                    !settings.electionIdName.trim() ||
                    !settings.publicity ||
                    !startDate ||
                    !endDate ||
                    (startDate.toString() ===
                      new Date(
                        initialElection.electionStartDate.seconds * 1000
                      ).toString() &&
                      endDate.toString() ===
                        new Date(
                          initialElection.electionEndDate.seconds * 1000
                        ).toString() &&
                      settings.name.trim() === initialElection.name.trim() &&
                      settings.electionIdName.trim() ===
                        initialElection.electionIdName.trim() &&
                      settings.publicity === initialElection.publicity)
                  }
                >
                  Save
                </Button>
              </Flex>
            </Stack>
          </form>
        )}
      </DashboardLayout>
    </>
  );
};

export default SettingsPage;

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const electionQuery = query(
    collection(firestore, "elections"),
    where("electionIdName", "==", context.query.electionIdName)
  );
  const electionSnapshot = await getDocs(electionQuery);
  if (electionSnapshot.docs.length === 0) {
    return {
      notFound: true,
    };
  } else {
    return {
      props: {
        session: await getSession(context),
        election: JSON.parse(JSON.stringify(electionSnapshot.docs[0].data())),
      },
    };
  }
};